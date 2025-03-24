const forge = require('node-forge');
const CryptoJS = require('crypto-js');
const bcrypt = require('bcryptjs');

const verifyPassword = async (password, hashedPassword) => {
    const match = await bcrypt.compare(password, hashedPassword);
    return match; 
};

const generateAESKey = () => {
    const randomBytes = CryptoJS.lib.WordArray.random(16);
    return CryptoJS.enc.Hex.stringify(randomBytes);
}

const encryptData = (data, key) => {
    const stringData = JSON.stringify(data);

    // Generate a random 16-byte IV
    const iv = CryptoJS.lib.WordArray.random(16);

    // Encrypt the JSON string using AES-CBC mode
    const encryptedData = CryptoJS.AES.encrypt(stringData, CryptoJS.enc.Utf8.parse(key), {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });

    // Return encrypted data and IV
    return {
        encryptedData: encryptedData.toString(), // Encrypted data as a string
        iv: iv.toString(CryptoJS.enc.Base64) // IV as a base64 string
    };
}

const decryptData = (encData, key, iv) => {
    // Parse the IV from the Base64 string
    const ivWordArray = CryptoJS.enc.Base64.parse(iv);

    // Decrypt the encrypted data
    const bytes = CryptoJS.AES.decrypt(encData, CryptoJS.enc.Utf8.parse(key), {
        iv: ivWordArray,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });

    // Convert decrypted bytes to a UTF-8 string
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);

    // Parse the decrypted string back to a JSON object
    return JSON.parse(decryptedData);
}

const encryptKeyRSA = (key, publicKeyPem) => {
    try {
        const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);

        // Encrypt the data using the public key
        const encryptedKey = publicKey.encrypt(key, 'RSA-OAEP', {
            md: forge.md.sha256.create(),  // Hashing algorithm
        });

        // Convert the encrypted data to a base64 encoded string for easy transmission
        return forge.util.encode64(encryptedKey);
    } catch (error) {
        return null;
    }
}

const generateRandomString = () => {
    return forge.random.getBytesSync(32); 
}

module.exports = { verifyPassword, generateAESKey, encryptData, decryptData, encryptKeyRSA, generateRandomString };
