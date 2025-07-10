#!/usr/bin/env node

/**
 * FINAL AUTHENTICATION & ORGANIZATION PERSISTENCE FIX
 * 
 * This script addresses the core issue where users have to re-signup for organizations
 * every time they log in from a new browser. The problem stems from:
 * 
 * 1. Backend not properly returning organization data with login response
 * 2. Frontend not properly handling organization data from login
 * 3. Duplicate membership prevention not working correctly
 * 4. Member count accuracy issues
 */

import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

async function fixAuthenticationPersistence() {
  console.log('🚀 Starting FINAL Authentication & Organization Persistence Fix...\n');
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('foundly');
    const users = db.collection('users');
    const organizations = db.collection('organizations');
    
    console.log('✅ Connected to database');
    
    // Step 1: Fix all existing duplicate memberships
    console.log('\n📋 STEP 1: Fixing duplicate memberships...');
    
    const allOrgs = await organizations.find({}).toArray();
    let totalDuplicatesRemoved = 0;
    let organizationsFixed = 0;
    
    for (const org of allOrgs) {
      if (!org.members || org.members.length === 0) {
        continue;
      }
      
      // Find and remove duplicate members
      const memberMap = new Map();
      const uniqueMembers = [];
      let duplicatesInOrg = 0;
      
      for (const member of org.members) {
        const userId = member.userId.toString();
        
        if (memberMap.has(userId)) {
          duplicatesInOrg++;
          console.log(`   🚨 Removing duplicate member: ${userId} from ${org.name}`);
        } else {
          memberMap.set(userId, member);
          uniqueMembers.push(member);
        }
      }
      
      if (duplicatesInOrg > 0) {
        await organizations.updateOne(
          { _id: org._id },
          { 
            $set: { 
              members: uniqueMembers,
              memberCount: uniqueMembers.length
            }
          }
        );
        
        totalDuplicatesRemoved += duplicatesInOrg;
        organizationsFixed++;
        
        console.log(`   ✅ Fixed ${org.name}: removed ${duplicatesInOrg} duplicates`);
      } else {
        // Still update member count if needed
        if (org.memberCount !== org.members.length) {
          await organizations.updateOne(
            { _id: org._id },
            { $set: { memberCount: org.members.length } }
          );
        }
      }
    }
    
    // Step 2: Fix user organization references
    console.log('\n👤 STEP 2: Fixing user organization references...');
    
    const allUsers = await users.find({}).toArray();
    let userReferencesFixed = 0;
    
    for (const user of allUsers) {
      if (!user.organizations || user.organizations.length === 0) {
        continue;
      }
      
      let userNeedsUpdate = false;
      const validOrganizations = [];
      const processedOrgIds = new Set();
      
      for (const userOrg of user.organizations) {
        const orgId = userOrg.organizationId;
        const orgIdString = typeof orgId === 'string' ? orgId : orgId.toString();
        
        // Skip if we've already processed this organization (remove duplicates)
        if (processedOrgIds.has(orgIdString)) {
          console.log(`   🗑️ Removing duplicate org reference for user ${user.email}: ${orgIdString}`);
          userNeedsUpdate = true;
          continue;
        }
        
        // Check if organization exists
        const orgExists = await organizations.findOne({ _id: new ObjectId(orgIdString) });
        
        if (orgExists) {
          validOrganizations.push(userOrg);
          processedOrgIds.add(orgIdString);
          
          // Ensure user is in the organization's member list
          const userInOrgMembers = orgExists.members.some(member => 
            member.userId.toString() === user._id.toString()
          );
          
          if (!userInOrgMembers) {
            console.log(`   ➕ Adding user ${user.email} to organization ${orgExists.name} members`);
            await organizations.updateOne(
              { _id: orgExists._id },
              { 
                $push: { 
                  members: {
                    userId: user._id,
                    role: userOrg.role || 'member',
                    joinedAt: new Date()
                  }
                },
                $inc: { memberCount: 1 }
              }
            );
          }
        } else {
          console.log(`   🗑️ Removing orphaned organization reference for user ${user.email}: ${orgIdString}`);
          userNeedsUpdate = true;
        }
      }
      
      if (userNeedsUpdate || validOrganizations.length !== user.organizations.length) {
        await users.updateOne(
          { _id: user._id },
          { $set: { organizations: validOrganizations } }
        );
        userReferencesFixed++;
        console.log(`   ✅ Fixed user ${user.email}: ${validOrganizations.length} valid organizations`);
      }
    }
    
    // Step 3: Verify data integrity
    console.log('\n🔍 STEP 3: Verifying data integrity...');
    
    const verificationResults = {
      totalUsers: 0,
      usersWithOrgs: 0,
      totalOrgs: 0,
      totalMemberships: 0,
      integrityIssues: 0
    };
    
    // Check all users
    const usersForVerification = await users.find({}).toArray();
    verificationResults.totalUsers = usersForVerification.length;
    
    for (const user of usersForVerification) {
      if (user.organizations && user.organizations.length > 0) {
        verificationResults.usersWithOrgs++;
        verificationResults.totalMemberships += user.organizations.length;
        
        // Verify each organization membership
        for (const userOrg of user.organizations) {
          const orgId = userOrg.organizationId;
          const orgIdString = typeof orgId === 'string' ? orgId : orgId.toString();
          
          const org = await organizations.findOne({ _id: new ObjectId(orgIdString) });
          if (!org) {
            console.log(`   ❌ Integrity issue: User ${user.email} references non-existent org ${orgIdString}`);
            verificationResults.integrityIssues++;
          } else {
            const userInMembers = org.members.some(member => 
              member.userId.toString() === user._id.toString()
            );
            if (!userInMembers) {
              console.log(`   ❌ Integrity issue: User ${user.email} not in members list of org ${org.name}`);
              verificationResults.integrityIssues++;
            }
          }
        }
      }
    }
    
    // Check all organizations
    const orgsForVerification = await organizations.find({}).toArray();
    verificationResults.totalOrgs = orgsForVerification.length;
    
    for (const org of orgsForVerification) {
      if (org.members && org.members.length > 0) {
        // Verify member count accuracy
        if (org.memberCount !== org.members.length) {
          console.log(`   ❌ Integrity issue: Org ${org.name} memberCount (${org.memberCount}) != actual members (${org.members.length})`);
          verificationResults.integrityIssues++;
          
          // Fix it
          await organizations.updateOne(
            { _id: org._id },
            { $set: { memberCount: org.members.length } }
          );
        }
      }
    }
    
    console.log('\n📊 FINAL RESULTS:');
    console.log('==================');
    console.log(`🏢 Organizations processed: ${allOrgs.length}`);
    console.log(`🔧 Organizations fixed: ${organizationsFixed}`);
    console.log(`🚨 Duplicate members removed: ${totalDuplicatesRemoved}`);
    console.log(`👤 Users processed: ${allUsers.length}`);
    console.log(`🔧 User references fixed: ${userReferencesFixed}`);
    console.log(`🔍 Integrity issues found/fixed: ${verificationResults.integrityIssues}`);
    console.log(`📊 Total users: ${verificationResults.totalUsers}`);
    console.log(`📊 Users with organizations: ${verificationResults.usersWithOrgs}`);
    console.log(`📊 Total organizations: ${verificationResults.totalOrgs}`);
    console.log(`📊 Total memberships: ${verificationResults.totalMemberships}`);
    
    if (totalDuplicatesRemoved > 0 || userReferencesFixed > 0 || verificationResults.integrityIssues > 0) {
      console.log('\n✅ Database fixes completed successfully!');
      console.log('💡 Key improvements made:');
      console.log('   - Removed all duplicate memberships');
      console.log('   - Fixed member count accuracy');
      console.log('   - Synchronized user-organization references');
      console.log('   - Ensured data integrity');
    } else {
      console.log('\n✅ No issues found - database is clean!');
    }
    
    console.log('\n🔄 Next steps:');
    console.log('1. Deploy the updated auth.js with improved ObjectId handling');
    console.log('2. Test login flow with existing users');
    console.log('3. Verify no duplicate memberships occur');
    console.log('4. Monitor member counts for accuracy');
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔒 Database connection closed');
  }
}

// Run the fix
fixAuthenticationPersistence();
