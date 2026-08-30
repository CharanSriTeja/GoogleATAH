import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate("backend/fourth-splice-506406-p8-firebase-adminsdk-fbsvc-2bcbc288f7.json")
firebase_admin.initialize_app(cred)

db = firestore.client()
users = db.collection("users").stream()

for user in users:
    print(f"User: {user.id}")
    profile = db.collection("users").document(user.id).collection("profile").document("default").get()
    if profile.exists:
        print(f"  Profile exists: {profile.to_dict()}")
    else:
        print("  No profile")
        