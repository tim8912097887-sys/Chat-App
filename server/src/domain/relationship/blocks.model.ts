import { randomUUID } from 'node:crypto';
import mongoose, { model, Schema } from 'mongoose';
import type { Model } from 'mongoose';
import { InferSchemaType } from 'mongoose';

export type BlockDocument = InferSchemaType<typeof blockSchema>;

export type BlockModel = Model<BlockDocument>;

const blockSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    blockerId: { type: String, required: true },
    blockedId: { type: String, required: true },
  },
  { collection: 'blocks', timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

export function registerBlocksModel(): BlockModel {
  return (mongoose.models.Block as BlockModel) ?? model<BlockDocument, BlockModel>('Block', blockSchema);
}