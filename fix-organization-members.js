const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/foundly', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Organization = require('./backend/models/Organization');
const User = require('./backend/models/User');

async function fixOrganizationMembers() {
  try {
    console.log('🔧 FIX: Starting organization members fix...');
    
    // Get all organizations
    const organizations = await Organization.find({});
    console.log(`🔧 FIX: Found ${organizations.length} organizations`);
    
    for (const org of organizations) {
      console.log(`\n🔧 FIX: Processing organization: ${org.name} (${org._id})`);
      console.log(`🔧 FIX: Created by: ${org.createdBy}`);
      console.log(`🔧 FIX: Current members: ${org.members.length}`);
      
      // Check if creator is in members array
      const creatorInMembers = org.members.some(member => 
        member.user.toString() === org.createdBy.toString()
      );
      
      if (!creatorInMembers) {
        console.log(`🔧 FIX: ⚠️ Creator not in members array, adding...`);
        
        // Add creator to members array
        org.members.push({
          user: org.createdBy,
          role: 'admin'
        });
        
        await org.save();
        console.log(`🔧 FIX: ✅ Creator added to members array`);
      } else {
        console.log(`🔧 FIX: ✅ Creator already in members array`);
      }
      
      // Also ensure creator has this organization in their user array
      const creator = await User.findById(org.createdBy);
      if (creator) {
        const hasOrgInUser = creator.organizations.some(userOrg => 
          userOrg.organizationId.toString() === org._id.toString()
        );
        
        if (!hasOrgInUser) {
          console.log(`🔧 FIX: ⚠️ Creator doesn't have org in user array, adding...`);
          
          await User.findByIdAndUpdate(org.createdBy, {
            $push: {
              organizations: {
                organizationId: org._id,
                role: 'admin'
              }
            }
          });
          
          console.log(`🔧 FIX: ✅ Organization added to creator's user array`);
        } else {
          console.log(`🔧 FIX: ✅ Creator already has org in user array`);
        }
      } else {
        console.log(`🔧 FIX: ⚠️ Creator user not found: ${org.createdBy}`);
      }
    }
    
    console.log('\n🔧 FIX: Organization members fix completed!');
    
  } catch (error) {
    console.error('🔧 FIX: Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

fixOrganizationMembers(); 