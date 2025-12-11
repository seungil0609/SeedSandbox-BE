// watchlist 모델은 비활성화함.
// import mongoose, { Schema, Document } from "mongoose";
//
// export interface IWatchlist extends Document {
//   user: Schema.Types.ObjectId;
//   itemId: Schema.Types.ObjectId;
//   itemType: "asset" | "post";
// }
//
// const WatchlistSchema: Schema = new Schema(
//   {
//     user: { type: Schema.Types.ObjectId, ref: "User", required: true },
//     itemId: { type: Schema.Types.ObjectId, required: true },
//     itemType: {
//       type: String,
//       enum: ["asset", "post"],
//       required: true,
//     },
//   },
//   { timestamps: true }
// );
//
// export default mongoose.model<IWatchlist>("Watchlist", WatchlistSchema);
