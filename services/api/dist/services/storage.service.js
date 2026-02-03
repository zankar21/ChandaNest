"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBucket = getBucket;
const firebase_1 = require("../config/firebase");
function getBucket() {
    return firebase_1.storage;
}
