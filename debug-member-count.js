const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/foundly', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Organization = require('./backend/models/Organization');
const User = require('./backend/models/User');

async function debugMemberCount() {
  try {
    console.log('🔍 DEBUG: Starting member count debug...');
    
    // Get all organizations
    const organizations = await Organization.find({});
    console.log(`🔍 DEBUG: Found ${organizations.length} organizations`);
    
    for (const org of organizations) {
      console.log(`\n🔍 DEBUG: Organization: ${org.name} (${org._id})`);
      console.log(`🔍 DEBUG: Join code: ${org.joinCode}`);
      console.log(`🔍 DEBUG: Raw members array:`, JSON.stringify(org.members, null, 2));
      
      // Count members using the same logic as the stats endpoint
      const uniqueActiveMembers = (org.members || [])
        .filter((member, index, arr) => {
          // Ensure member has a valid user ID
          if (!member.user) {
            console.log(`🔍 DEBUG: Member without user field:`, member);
            return false;
          }
          
          // Check if this is the first occurrence of this user ID (remove duplicates)
          const firstIndex = arr.findIndex(m => m.user.toString() === member.user.toString());
          if (firstIndex !== index) {
            console.log(`🔍 DEBUG: Duplicate member found: ${member.user} at index ${index}, first at ${firstIndex}`);
            return false;
          }
          
          // Optionally check if member is active (if isActive field exists)
          if (member.hasOwnProperty('isActive') && member.isActive === false) {
            console.log(`🔍 DEBUG: Inactive member: ${member.user}`);
            return false;
          }
          
          return true;
        });
      
      console.log(`🔍 DEBUG: Unique active members: ${uniqueActiveMembers.length}`);
      console.log(`🔍 DEBUG: Member IDs:`, uniqueActiveMembers.map(m => m.user.toString()));
      
      // Also check users who have this organization in their organizations array
      const usersWithOrg = await User.find({
        'organizations.organizationId': org._id
      });
      
      console.log(`🔍 DEBUG: Users with org in their array: ${usersWithOrg.length}`);
      console.log(`🔍 DEBUG: User IDs:`, usersWithOrg.map(u => u._id.toString()));
      
      // Check for inconsistencies
      const orgMemberIds = uniqueActiveMembers.map(m => m.user.toString());
      const userMemberIds = usersWithOrg.map(u => u._id.toString());
      
      const inOrgNotInUser = orgMemberIds.filter(id => !userMemberIds.includes(id));
      const inUserNotInOrg = userMemberIds.filter(id => !orgMemberIds.includes(id));
      
      if (inOrgNotInUser.length > 0) {
        console.log(`🔍 DEBUG: ⚠️ Members in org but not in user array:`, inOrgNotInUser);
      }
      
      if (inUserNotInOrg.length > 0) {
        console.log(`🔍 DEBUG: ⚠️ Users with org but not in org members:`, inUserNotInOrg);
      }
    }
    
  } catch (error) {
    console.error('🔍 DEBUG: Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

debugMemberCount(); 