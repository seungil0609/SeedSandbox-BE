// watchlist 기능은 비활성화.
// import type { Request, Response } from "express";
// import type { AuthRequest } from "../middleware/authMiddleware.js";
// import Watchlist from "../models/Watchlist.js";
// import Asset from "../models/Asset.js";
// import Post from "../models/Post.js";
// import { Types } from "mongoose";
//
// // 관심 종목 추가 컨트롤러
// export const addToWatchlist = async (req: AuthRequest, res: Response) => {
//   try {
//     const { itemId, itemType } = req.body;
//     const userId = req.user?._id;
//
//     if (!userId) {
//       return res.status(401).json({ message: "로그인이 필요합니다." });
//     }
//
//     if (itemType === "asset") {
//       const assetExists = await Asset.exists({ _id: itemId });
//       if (!assetExists) {
//         return res
//           .status(404)
//           .json({ message: "해당 자산을 찾을 수 없습니다." });
//       }
//     } else if (itemType === "post") {
//       const postExists = await Post.exists({ _id: itemId });
//       if (!postExists) {
//         return res
//           .status(404)
//           .json({ message: "해당 게시글을 찾을 수 없습니다." });
//       }
//     } else {
//       return res.status(400).json({ message: "유효하지 않은 itemType입니다." });
//     }
//
//     const existing = await Watchlist.findOne({
//       user: userId,
//       itemId,
//       itemType,
//     });
//
//     if (existing) {
//       return res.status(409).json({ message: "이미 watchlist에 존재합니다." });
//     }
//
//     const watch = new Watchlist({
//       user: userId,
//       itemId,
//       itemType,
//     });
//     await watch.save();
//
//     return res.status(201).json({
//       message: "watchlist에 추가되었습니다.",
//       watchlistId: watch._id,
//     });
//   } catch (error) {
//    console.error("watchlist 추가 에러:", error);
//    return res.status(500).json({ message: "서버 에러" });
//   }
// };
//
// // 관심 종목 조회 컨트롤러
// export const getWatchlistQuotes = async (req: AuthRequest, res: Response) => {
//   try {
//     const userId = req.user?._id;
//     if (!userId) {
//       return res.status(401).json({ message: "로그인이 필요합니다." });
//     }
//
//     const watchlist = await Watchlist.find({ user: userId })
//       .sort({ createdAt: -1 })
//       .lean();
//
//     const assetIds = watchlist
//       .filter((w) => w.itemType === "asset")
//       .map((w) => w.itemId);
//     const postIds = watchlist
//       .filter((w) => w.itemType === "post")
//       .map((w) => w.itemId);
//
//     const [assets, posts] = await Promise.all([
//       Asset.find({ _id: { $in: assetIds } }).lean(),
//       Post.find({ _id: { $in: postIds } }).lean(),
//     ]);
//
//     const assetMap = new Map<string, any>();
//     const postMap = new Map<string, any>();
//     assets.forEach((a: any) => assetMap.set(a._id.toString(), a));
//     posts.forEach((p: any) => postMap.set(p._id.toString(), p));
//
//     const result = watchlist.map((w) => {
//       if (w.itemType === "asset") {
//         return {
//           watchlistId: w._id,
//           itemType: w.itemType,
//           item: assetMap.get(w.itemId.toString()) || null,
//         };
//       }
//       if (w.itemType === "post") {
//         return {
//           watchlistId: w._id,
//           itemType: w.itemType,
//           item: postMap.get(w.itemId.toString()) || null,
//         };
//       }
//       return {
//         watchlistId: w._id,
//         itemType: w.itemType,
//         item: null,
//       };
//     });
//
//     return res.status(200).json(result);
//   } catch (error) {
//     console.error("watchlist 조회 에러:", error);
//     return res.status(500).json({ message: "서버 에러" });
//   }
// };
//
// // 관심 종목 삭제 컨트롤러
// export const removeFromWatchlist = async (
//   req: AuthRequest,
//   res: Response
// ) => {
//   try {
//     const userId = req.user?._id;
//     const { watchlistId } = req.params;
//
//     if (!userId) {
//       return res.status(401).json({ message: "로그인이 필요합니다." });
//     }
//
//     if (!watchlistId) {
//       return res
//         .status(400)
//         .json({ message: "삭제할 watchlistId가 필요합니다." });
//     }
//
//     if (!Types.ObjectId.isValid(watchlistId)) {
//       return res
//         .status(400)
//         .json({ message: "유효하지 않은 watchlistId입니다." });
//     }
//
//     const deleted = await Watchlist.findOneAndDelete({
//       _id: watchlistId,
//       user: userId,
//     });
//
//     if (!deleted) {
//       return res
//         .status(404)
//         .json({ message: "삭제할 대상을 찾을 수 없습니다." });
//     }
//
//     return res.status(200).json({ message: "watchlist에서 삭제되었습니다." });
//   } catch (error) {
//     console.error("watchlist 삭제 에러:", error);
//     return res.status(500).json({ message: "서버 에러" });
//   }
// };
