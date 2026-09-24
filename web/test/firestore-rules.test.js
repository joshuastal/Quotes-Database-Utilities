const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {after, before, test} = require("node:test");
const {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
} = require("@firebase/rules-unit-testing");
const {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
} = require("firebase/firestore");

const OWNER_UID = "oae8puGU5RYvlW0YxbyrGyjiCM33";
const OTHER_UID = "different-authenticated-user";
const PROJECT_ID = "demo-quotes-owner-rules";
const rules = fs.readFileSync(path.join(__dirname, "..", "firestore.rules"), "utf8");
let testEnv;

before(async () => {
    testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: {rules},
    });
});

after(async () => {
    await testEnv.cleanup();
});

test("only the owner can use Quotes and no account can use unrelated collections", async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).firestore();
    const otherDb = testEnv.authenticatedContext(OTHER_UID).firestore();
    const signedOutDb = testEnv.unauthenticatedContext().firestore();
    const quoteRef = doc(collection(ownerDb, "Quotes"), "rules-test-quote");
    const protectedQuotePath = "rules-test-protected";
    const secondQuoteRef = doc(collection(ownerDb, "Quotes"), protectedQuotePath);

    await assertSucceeds(getDocs(collection(ownerDb, "Quotes")));
    await assertSucceeds(getDoc(quoteRef));
    await assertSucceeds(setDoc(quoteRef, {Author: "Owner", Quote: "Create", tags: []}));
    await assertSucceeds(updateDoc(quoteRef, {Quote: "Update"}));
    await assertSucceeds(deleteDoc(quoteRef));
    await assertSucceeds(setDoc(secondQuoteRef, {Author: "Owner", Quote: "Protected", tags: []}));

    for (const db of [otherDb, signedOutDb]) {
        const createRef = doc(collection(db, "Quotes"), `${OTHER_UID}-create`);
        const deniedQuoteRef = doc(collection(db, "Quotes"), protectedQuotePath);

        await assertFails(getDocs(collection(db, "Quotes")));
        await assertFails(getDoc(deniedQuoteRef));
        await assertFails(setDoc(createRef, {Author: "Denied", Quote: "Create", tags: []}));
        await assertFails(updateDoc(deniedQuoteRef, {Quote: "Denied update"}));
        await assertFails(deleteDoc(deniedQuoteRef));
    }

    const otherCollection = collection(ownerDb, "Unrelated");
    const otherDocument = doc(otherCollection, "document");

    await assertFails(getDocs(otherCollection));
    await assertFails(getDoc(otherDocument));
    await assertFails(setDoc(otherDocument, {value: true}));
    await assertSucceeds(deleteDoc(secondQuoteRef));
    assert.equal((await getDoc(secondQuoteRef)).exists(), false);
});
