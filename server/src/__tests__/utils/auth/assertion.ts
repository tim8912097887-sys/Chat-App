import { expect } from "vitest";
import { UserDocument } from "../../../domain/user/user.model.js";

export const userResult = (user: Partial<UserDocument>): UserDocument => {
  const userDocument: UserDocument = {
    _id: expect.any(String),
    name: expect.any(String),
    email: expect.any(String),
    passwordHash: expect.any(String),
    imageUrl: null,
    searchCode: expect.any(String),
    status: "ACTIVE",
    tokenVersion: 0,
    loginAttempt: 0,
    loginLockedAt: null,
    createdAt: expect.any(Date),
    updatedAt: expect.any(Date),
    ...user,
  };

  return userDocument;
};
