import { getModuleAccess, DEFAULT_PROFILES } from './lib/permissions';

const profiles = DEFAULT_PROFILES;
const appUsers = [];
const user = { id: 'test-user', role: 'seller', email: 'vendedor@test.com' };

console.log("DEFAULT profile-vendedor estoque:", profiles.find(p => p.id === 'profile-vendedor')?.permissions.estoque);
console.log("Access for estoque/materia:", getModuleAccess(user, appUsers, profiles, 'estoque', 'materia_prima'));
console.log("Access for estoque/materia (no subModule):", getModuleAccess(user, appUsers, profiles, 'estoque'));
