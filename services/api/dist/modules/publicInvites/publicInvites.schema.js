"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AcceptInviteSchema = void 0;
const zod_1 = require("zod");
exports.AcceptInviteSchema = zod_1.z.object({
    token: zod_1.z.string().trim().min(20),
    uid: zod_1.z.string().trim().min(1)
});
