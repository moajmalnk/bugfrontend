// Browser Cache Clear Script
// Run this in the browser console to clear all caches

console.log('🧹 Clearing browser cache...');

// Clear localStorage
localStorage.clear();
console.log('✅ localStorage cleared');

// Clear sessionStorage
sessionStorage.clear();
console.log('✅ sessionStorage cleared');

// Clear service worker caches
if ('caches' in window) {
  caches.keys().then(names => {
    names.forEach(name => {
      caches.delete(name);
      console.log(`✅ Cache deleted: ${name}`);
    });
  });
}

// Clear IndexedDB
if ('indexedDB' in window) {
  indexedDB.databases().then(databases => {
    databases.forEach(db => {
      indexedDB.deleteDatabase(db.name);
      console.log(`✅ IndexedDB deleted: ${db.name}`);
    });
  });
}

console.log('🎉 Browser cache cleared! Please refresh the page (Ctrl + Shift + R)');
