import { openDB } from 'idb';

const DB_NAME = 'pocket-prc-4';
const DB_VERSION = 1;

function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('checklists')) {
        db.createObjectStore('checklists', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
      }
    },
  });
}

export async function saveChecklist(checklist) {
  const db = await getDb();
  const record = {
    ...checklist,
    id: checklist.id || `local_${Date.now()}`,
    updatedAt: new Date().toISOString(),
  };
  await db.put('checklists', record);
  return record;
}

export async function getChecklist(id) {
  const db = await getDb();
  return db.get('checklists', id);
}

export async function getAllChecklists() {
  const db = await getDb();
  return db.getAll('checklists');
}

export async function deleteChecklist(id) {
  const db = await getDb();
  return db.delete('checklists', id);
}
