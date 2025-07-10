const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/foundly', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Organization = require('./backend/models/Organization');
const User = require('./backend/models/User');

async function debugUserOrgs() {
  try {
    console.log('🔍 DEBUG: Starting user organizations debug...');
    
    // Get all users
    const users = await User.find({});
    console.log(`🔍 DEBUG: Found ${users.length} users`);
    
    for (const user of users) {
      console.log(`\n🔍 DEBUG: User: ${user.name} (${user.email}) - ${user._id}`);
      console.log(`🔍 DEBUG: Current org: ${user.currentOrganization}`);
      console.log(`🔍 DEBUG: Organizations in user array:`, user.organizations);
      
      // Check each organization the user claims to be in
      for (const userOrg of user.organizations) {
        const org = await Organization.findById(userOrg.organizationId);
        if (org) {
          const isInOrgMembers = org.members.some(member => 
            member.user.toString() === user._id.toString()
          );
          
          console.log(`🔍 DEBUG:   Org: ${org.name} (${org._id})`);
          console.log(`🔍 DEBUG:     User claims role: ${userOrg.role}`);
          console.log(`🔍 DEBUG:     User in org members: ${isInOrgMembers}`);
          
          if (!isInOrgMembers) {
            console.log(`🔍 DEBUG:     ⚠️ MISMATCH: User not in org members!`);
            console.log(`🔍 DEBUG:     Org members:`, org.members.map(m => m.user.toString()));
          }
        } else {
          console.log(`🔍 DEBUG:   ⚠️ Org not found: ${userOrg.organizationId}`);
        }
      }
    }
    
  } catch (error) {
    console.error('🔍 DEBUG: Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

debugUserOrgs(); 