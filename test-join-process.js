const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/foundly', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Organization = require('./backend/models/Organization');
const User = require('./backend/models/User');

async function testJoinProcess() {
  try {
    console.log('🧪 TEST: Starting join process test...');
    
    // Get all users
    const users = await User.find({});
    console.log(`🧪 TEST: Found ${users.length} users`);
    
    // Get all organizations
    const organizations = await Organization.find({});
    console.log(`🧪 TEST: Found ${organizations.length} organizations`);
    
    // Test joining a user to an organization
    const testUser = users[0]; // Use the first user
    const testOrg = organizations[0]; // Use the first organization
    
    console.log(`\n🧪 TEST: Testing join process...`);
    console.log(`🧪 TEST: User: ${testUser.name} (${testUser.email})`);
    console.log(`🧪 TEST: Organization: ${testOrg.name} (${testOrg.joinCode})`);
    
    // Check if user is already a member
    const isInOrgMembers = testOrg.members.some(member => 
      member.user.toString() === testUser._id.toString()
    );
    
    const isInUserOrgs = testUser.organizations.some(org => 
      org.organizationId.toString() === testOrg._id.toString()
    );
    
    console.log(`🧪 TEST: User in org members: ${isInOrgMembers}`);
    console.log(`🧪 TEST: User has org in user array: ${isInUserOrgs}`);
    
    if (!isInOrgMembers && !isInUserOrgs) {
      console.log(`🧪 TEST: Adding user to organization...`);
      
      // Add user to organization
      testOrg.members.push({
        user: testUser._id,
        role: 'member'
      });
      await testOrg.save();
      
      // Add organization to user
      await User.findByIdAndUpdate(testUser._id, {
        $push: {
          organizations: {
            organizationId: testOrg._id,
            role: 'member'
          }
        },
        currentOrganization: testOrg._id
      });
      
      console.log(`🧪 TEST: ✅ User successfully added to organization`);
    } else {
      console.log(`🧪 TEST: User is already a member or there's an inconsistency`);
    }
    
    // Verify the join worked
    const updatedOrg = await Organization.findById(testOrg._id);
    const updatedUser = await User.findById(testUser._id);
    
    console.log(`\n🧪 TEST: Verification:`);
    console.log(`🧪 TEST: Org members after join: ${updatedOrg.members.length}`);
    console.log(`🧪 TEST: User orgs after join: ${updatedUser.organizations.length}`);
    console.log(`🧪 TEST: User current org: ${updatedUser.currentOrganization}`);
    
  } catch (error) {
    console.error('🧪 TEST: Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

testJoinProcess(); 