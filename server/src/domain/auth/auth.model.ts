import { Model, model, models, Schema } from "mongoose";
import { InferSchemaType } from "mongoose";

export type RefreshTokenDocument = InferSchemaType<typeof refreshTokenSchema>;

export type RefreshTokenModel = Model<RefreshTokenDocument>;

export const refreshTokenSchema = new Schema(
  {
    _id: {
      type: String,
      required: true,
    },

    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },

    familyId: {
      type: String,
      required: true,
      index: true,
    },

    parentId: {
      type: String,
      default: null,
    },

    replacedById: {
      type: String,
      default: null,
    },

    revokedAt: {
      type: Date,
      default: null,
    },

    expiredAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export function getRefreshTokenModel(): RefreshTokenModel {
  return (
    models.RefreshToken ??
    model<RefreshTokenDocument>("RefreshToken", refreshTokenSchema)
  );
}
