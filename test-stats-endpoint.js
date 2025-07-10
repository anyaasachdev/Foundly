const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/foundly', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Organization = require('./backend/models/Organization');
const User = require('./backend/models/User');

async function testStatsEndpoint() {
  try {
    console.log('🧪 TEST: Testing stats endpoint logic...');
    
    // Get all organizations
    const organizations = await Organization.find({});
    console.log(`🧪 TEST: Found ${organizations.length} organizations`);
    
    for (const org of organizations) {
      console.log(`\n🧪 TEST: Testing organization: ${org.name} (${org._id})`);
      
      // Simulate the stats endpoint logic
      const uniqueActiveMembers = (org.members || [])
        .filter((member, index, arr) => {
          // Ensure member has a valid user ID
          if (!member.user) return false;
          
          // Check if this is the first occurrence of this user ID (remove duplicates)
          const firstIndex = arr.findIndex(m => m.user.toString() === member.user.toString());
          if (firstIndex !== index) return false;
          
          // Optionally check if member is active (if isActive field exists)
          if (member.hasOwnProperty('isActive') && member.isActive === false) return false;
          
          return true;
        });
      
      const totalMembers = uniqueActiveMembers.length || 0;
      
      console.log(`🧪 TEST: Stats endpoint would return totalMembers: ${totalMembers}`);
      console.log(`🧪 TEST: Member IDs:`, uniqueActiveMembers.map(m => m.user.toString()));
      
      // Also check what the working endpoint would return (for comparison)
      const workingMembers = (org.members || [])
        .filter((member, index, arr) => {
          // Working endpoint uses userId (string) instead of user (ObjectId)
          if (!member.userId) return false;
          
          const firstIndex = arr.findIndex(m => m.userId === member.userId);
          if (firstIndex !== index) return false;
          
          if (member.hasOwnProperty('isActive') && member.isActive === false) return false;
          
          return true;
        });
      
      const workingTotalMembers = workingMembers.length || 0;
      
      console.log(`🧪 TEST: Working endpoint would return totalMembers: ${workingTotalMembers}`);
      console.log(`🧪 TEST: Working member IDs:`, workingMembers.map(m => m.userId));
      
      if (totalMembers !== workingTotalMembers) {
        console.log(`🧪 TEST: ⚠️ MISMATCH: Stats endpoint (${totalMembers}) vs Working endpoint (${workingTotalMembers})`);
      } else {
        console.log(`🧪 TEST: ✅ Both endpoints return same count: ${totalMembers}`);
      }
    }
    
  } catch (error) {
    console.error('🧪 TEST: Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

testStatsEndpoint(); 