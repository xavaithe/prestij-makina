/**
 * Prestij Makina - Firebase & Firestore Integration Service
 * Realtime Database ve Cloud Firestore Canlı Senkronizasyon Modülü
 */

let firebaseApp = null;
let firebaseDb = null;
let firebaseFirestore = null;
let firebaseConfig = null;

export async function initFirebase(config) {
  if (!config || !config.apiKey || !config.projectId) {
    console.log('ℹ️ Firebase henüz yapılandırılmadı. Yerel API modunda çalışılıyor.');
    return { success: false, message: 'Firebase API anahtarları eksik.' };
  }

  try {
    firebaseConfig = config;
    if (window.firebase) {
      if (!window.firebase.apps.length) {
        firebaseApp = window.firebase.initializeApp(config);
      } else {
        firebaseApp = window.firebase.app();
      }
      firebaseDb = window.firebase.database ? window.firebase.database() : null;
      firebaseFirestore = window.firebase.firestore ? window.firebase.firestore() : null;
      return { success: true, message: 'Firebase & Firestore bağlantısı başarıyla kuruldu!' };
    } else {
      await loadFirebaseSDK();
      if (window.firebase && !window.firebase.apps.length) {
        firebaseApp = window.firebase.initializeApp(config);
        firebaseDb = window.firebase.database ? window.firebase.database() : null;
        firebaseFirestore = window.firebase.firestore ? window.firebase.firestore() : null;
      }
      return { success: true, message: 'Firebase SDK yüklendi ve bağlandı!' };
    }
  } catch (err) {
    console.warn('Firebase başlatma hatası:', err);
    return { success: false, message: err.message };
  }
}

function loadFirebaseSDK() {
  return new Promise((resolve, reject) => {
    if (window.firebase) return resolve();

    const appScript = document.createElement('script');
    appScript.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js';
    appScript.onload = () => {
      const dbScript = document.createElement('script');
      dbScript.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js';
      dbScript.onload = () => {
        const fsScript = document.createElement('script');
        fsScript.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js';
        fsScript.onload = () => resolve();
        fsScript.onerror = () => resolve(); // continue even if firestore script fails
        document.head.appendChild(fsScript);
      };
      dbScript.onerror = () => reject(new Error('Firebase DB SDK yüklenemedi'));
      document.head.appendChild(dbScript);
    };
    appScript.onerror = () => reject(new Error('Firebase App SDK yüklenemedi'));
    document.head.appendChild(appScript);
  });
}

export async function syncContentToFirebase(contentData) {
  if (!firebaseApp || !window.firebase) {
    throw new Error('Firebase henüz başlatılmadı. Lütfen API anahtarlarını doğrulayın.');
  }

  let rtdbSuccess = false;
  let firestoreSuccess = false;

  // Realtime DB Sync
  try {
    if (window.firebase.database) {
      const db = window.firebase.database();
      await db.ref('siteContent').set(contentData);
      rtdbSuccess = true;
    }
  } catch (err) {
    console.warn('RTDB sync warning:', err);
  }

  // Firestore Sync
  try {
    if (window.firebase.firestore) {
      const fs = window.firebase.firestore();
      await fs.collection('prestij_data').doc('siteContent').set(contentData);
      firestoreSuccess = true;
    }
  } catch (err) {
    console.warn('Firestore sync warning:', err);
  }

  if (!rtdbSuccess && !firestoreSuccess) {
    throw new Error('Firebase / Firestore senkronizasyonu gerçekleştirilemedi.');
  }

  return { success: true, timestamp: new Date().toISOString() };
}

export async function fetchContentFromFirebase() {
  if (!firebaseApp || !window.firebase) {
    throw new Error('Firebase henüz başlatılmadı.');
  }

  // Try Firestore first
  try {
    if (window.firebase.firestore) {
      const fs = window.firebase.firestore();
      const doc = await fs.collection('prestij_data').doc('siteContent').get();
      if (doc.exists) {
        return doc.data();
      }
    }
  } catch (err) {
    console.warn('Firestore fetch warning:', err);
  }

  // Fallback to Realtime DB
  try {
    if (window.firebase.database) {
      const db = window.firebase.database();
      const snapshot = await db.ref('siteContent').once('value');
      if (snapshot.exists()) {
        return snapshot.val();
      }
    }
    return null;
  } catch (err) {
    throw new Error(`Firebase veri çekme hatası: ${err.message}`);
  }
}

export function isFirebaseReady() {
  return !!firebaseApp;
}
