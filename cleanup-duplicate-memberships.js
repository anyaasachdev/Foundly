#!/usr/bin/env node

// Database cleanup script to fix duplicate memberships and member counts
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

async function cleanupDuplicateMemberships() {
  console.log('🧹 Starting database cleanup for duplicate memberships...\n');
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('foundly');
    const organizations = db.collection('organizations');
    const users = db.collection('users');
    
    console.log('✅ Connected to database');
    
    // Get all organizations
    const allOrgs = await organizations.find({}).toArray();
    console.log(`📊 Found ${allOrgs.length} organizations\n`);
    
    let totalDuplicatesRemoved = 0;
    let organizationsFixed = 0;
    
    for (const org of allOrgs) {
      console.log(`🔍 Checking organization: ${org.name}`);
      
      if (!org.members || org.members.length === 0) {
        console.log('   ⚠️ No members found, skipping');
        continue;
      }
      
      // Find duplicate members
      const memberMap = new Map();
      const duplicates = [];
      const uniqueMembers = [];
      
      for (const member of org.members) {
        const userId = member.userId.toString();
        
        if (memberMap.has(userId)) {
          duplicates.push(member);
          console.log(`   🚨 Duplicate member found: ${userId}`);
        } else {
          memberMap.set(userId, member);
          uniqueMembers.push(member);
        }
      }
      
      if (duplicates.length > 0) {
        console.log(`   🔧 Removing ${duplicates.length} duplicate members`);
        
        // Update organization with unique members only
        await organizations.updateOne(
          { _id: org._id },
          { 
            $set: { 
              members: uniqueMembers,
              memberCount: uniqueMembers.length
            }
          }
        );
        
        totalDuplicatesRemoved += duplicates.length;
        organizationsFixed++;
        
        console.log(`   ✅ Fixed: ${org.name} (${uniqueMembers.length} unique members)`);
      } else {
        // Update member count to match actual members
        if (org.memberCount !== org.members.length) {
          await organizations.updateOne(
            { _id: org._id },
            { $set: { memberCount: org.members.length } }
          );
          console.log(`   🔢 Updated member count: ${org.members.length}`);
        } else {
          console.log(`   ✅ No issues found`);
        }
      }
      
      console.log('');
    }
    
    // Check for orphaned user organization references
    console.log('🔍 Checking for orphaned user organization references...\n');
    
    const allUsers = await users.find({}).toArray();
    let orphanedReferencesRemoved = 0;
    
    for (const user of allUsers) {
      if (!user.organizations || user.organizations.length === 0) {
        continue;
      }
      
      console.log(`👤 Checking user: ${user.email}`);
      
      const validOrganizations = [];
      
      for (const userOrg of user.organizations) {
        const orgExists = await organizations.findOne({ _id: userOrg.organizationId });
        
        if (orgExists) {
          validOrganizations.push(userOrg);
        } else {
          console.log(`   🗑️ Removing orphaned organization reference: ${userOrg.organizationId}`);
          orphanedReferencesRemoved++;
        }
      }
      
      if (validOrganizations.length !== user.organizations.length) {
        await users.updateOne(
          { _id: user._id },
          { $set: { organizations: validOrganizations } }
        );
        console.log(`   ✅ Updated user organizations: ${validOrganizations.length} valid refs`);
      }
    }
    
    console.log('\n📊 Cleanup Summary:');
    console.log('==================');
    console.log(`🏢 Organizations processed: ${allOrgs.length}`);
    console.log(`🔧 Organizations fixed: ${organizationsFixed}`);
    console.log(`🚨 Duplicate members removed: ${totalDuplicatesRemoved}`);
    console.log(`🗑️ Orphaned references removed: ${orphanedReferencesRemoved}`);
    
    if (totalDuplicatesRemoved > 0 || orphanedReferencesRemoved > 0) {
      console.log('\n✅ Database cleanup completed successfully!');
      console.log('💡 All duplicate memberships have been resolved.');
      console.log('📈 Member counts are now accurate.');
    } else {
      console.log('\n✅ No issues found - database is clean!');
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await client.close();
    console.log('\n🔒 Database connection closed');
  }
}

// Run the cleanup
cleanupDuplicateMemberships();
