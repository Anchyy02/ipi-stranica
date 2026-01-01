const firebaseConfig = {
    apiKey: "AIzaSyAX7q0RqgD9hv0GI0bBHF8GUYFmpNeBFQ0",
    authDomain: "ipiprojekat.firebaseapp.com",
    projectId: "ipiprojekat",
    storageBucket: "ipiprojekat.firebasestorage.app",
    messagingSenderId: "803249707770",
    appId: "1:803249707770:web:a7451bf5cef908257e8743",
    measurementId: "G-MLXJBQJRNN"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(() => {
        console.log('Firebase initialized with LOCAL persistence');
    })
    .catch((error) => {
        console.error('Error setting persistence:', error);
    });
