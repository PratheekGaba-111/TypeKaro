import { Schema, model, Document, Types } from "mongoose";

export interface SessionDocument extends Document {
  userId: Types.ObjectId;
  textLength: number;
  timeTakenMs: number;
  wpm: number;
  accuracy: number;
  netWpm: number;
  generationTimeMs: number;
  efficiency: number;
  imageUrl: string;
  targetText: string;
  typedText: string;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<SessionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    textLength: {
      type: Number,
      required: true
    },
    timeTakenMs: {
      type: Number,
      required: true
    },
    wpm: {
      type: Number,
      required: true
    },
    accuracy: {
      type: Number,
      required: true
    },
    netWpm: {
      type: Number,
      required: true
    },
    generationTimeMs: {
      type: Number,
      required: true
    },
    efficiency: {
      type: Number,
      required: true
    },
    imageUrl: {
      type: String,
      default: ""
    },
    targetText: {
      type: String,
      default: ""
    },
    typedText: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

export const Session = model<SessionDocument>("Session", sessionSchema);
