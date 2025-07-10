// Simple test to verify organization switching
console.log('🧪 Testing Organization Switching...');

// Test localStorage operations
const testOrgId = 'test-org-123';
localStorage.setItem('currentOrganization', testOrgId);

console.log('✅ Set test organization ID:', testOrgId);
console.log('📋 Current organization from localStorage:', localStorage.getItem('currentOrganization'));

// Test organization data structure handling
const mockOrganizations = [
  {
    _id: 'org-1',
    organizationId: { _id: 'org-1', name: 'Test Org 1' },
    role: 'admin'
  },
  {
    _id: 'org-2', 
    organizationId: { _id: 'org-2', name: 'Test Org 2' },
    role: 'member'
  }
];

console.log('📊 Mock organizations:', mockOrganizations);

// Test organization finding logic
const findOrg = (orgs, targetId) => {
  return orgs.find(org => {
    const orgId = org._id || org.organization?._id || org.organizationId;
    return orgId === targetId;
  });
};

const foundOrg = findOrg(mockOrganizations, 'org-1');
console.log('🔍 Found organization:', foundOrg);

// Test active organization comparison
const currentOrgId = localStorage.getItem('currentOrganization');
const isActive = (org) => {
  const orgId = org._id || org.organization?._id || org.organizationId;
  return orgId === currentOrgId;
};

mockOrganizations.forEach(org => {
  console.log(`📋 ${org.organizationId?.name}: ${isActive(org) ? 'ACTIVE' : 'inactive'}`);
});

console.log('✅ Organization switching test complete!'); 