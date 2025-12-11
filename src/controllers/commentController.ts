import type { Request, Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware.js";
import Post from "../models/Post.js";
import Comment from "../models/Comment.js";

// 댓글 생성
export const createComment = async (req: AuthRequest, res: Response) => {
  try {
    const { content, parentComment } = req.body;
    const postId = req.params.id;
    const user = req.user;

    if (!content) {
      return res.status(400).json({ message: "댓글 내용을 입력해주세요." });
    }
    if (!user) {
      return res
        .status(401)
        .json({ message: "사용자 정보를 찾을 수 없습니다." });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "게시글을 찾을 수 없습니다." });
    }

    let parentCommentId = null;
    if (parentComment) {
      const parent = await Comment.findById(parentComment);
      if (!parent) {
        return res
          .status(404)
          .json({ message: "부모 댓글을 찾을 수 없습니다." });
      }

      if ((parent.post as any).toString() !== postId) {
        return res
          .status(400)
          .json({ message: "부모 댓글이 다른 게시글에 속해 있습니다." });
      }
      parentCommentId = parent._id;
    }

    const newComment = new Comment({
      content,
      post: postId,
      user: user._id,
      parentComment: parentCommentId,
    });

    await newComment.save();
    res.status(201).json(newComment);
  } catch (error) {
    console.error("댓글 생성 에러:", error);
    res.status(500).json({ message: "서버 에러가 발생했습니다." });
  }
};

// 댓글 조회
export const getComments = async (req: Request, res: Response) => {
  try {
    const postId = req.params.id;
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "게시글을 찾을 수 없습니다." });
    }

    const comments = await Comment.find({ post: postId })
      .sort({ createdAt: 1 })
      .populate("user", "nickname email");

    res.status(200).json(comments);
  } catch (error) {
    console.error("댓글 목록 조회 에러:", error);
    res.status(500).json({ message: "서버 에러가 발생했습니다." });
  }
};

// 댓글 수정
export const updateComment = async (req: AuthRequest, res: Response) => {
  try {
    const { content } = req.body;
    const { postId, commentId } = req.params as {
      postId: string;
      commentId: string;
    };

    if (!content) {
      return res.status(400).json({ message: "댓글 내용을 입력해주세요." });
    }
    if (!req.user) {
      return res
        .status(401)
        .json({ message: "사용자 정보를 찾을 수 없습니다." });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "댓글을 찾을 수 없습니다." });
    }

    if ((comment.post as any).toString() !== postId) {
      return res
        .status(400)
        .json({
          message: "요청 경로의 게시글과 댓글 정보가 일치하지 않습니다.",
        });
    }
    if ((comment.user as any).toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "댓글을 수정할 권한이 없습니다." });
    }

    comment.content = content;
    const updated = await comment.save();
    res.status(200).json(updated);
  } catch (error) {
    console.error("댓글 수정 에러:", error);
    res.status(500).json({ message: "서버 에러가 발생했습니다." });
  }
};

// 댓글 삭제
export const deleteComment = async (req: AuthRequest, res: Response) => {
  try {
    const { postId, commentId } = req.params as {
      postId: string;
      commentId: string;
    };

    if (!req.user) {
      return res
        .status(401)
        .json({ message: "사용자 정보를 찾을 수 없습니다." });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "댓글을 찾을 수 없습니다." });
    }

    if ((comment.post as any).toString() !== postId) {
      return res
        .status(400)
        .json({
          message: "요청 경로의 게시글과 댓글 정보가 일치하지 않습니다.",
        });
    }
    if ((comment.user as any).toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "댓글을 삭제할 권한이 없습니다." });
    }

    await comment.deleteOne();
    res.status(200).json({ message: "댓글이 삭제되었습니다." });
  } catch (error) {
    console.error("댓글 삭제 에러:", error);
    res.status(500).json({ message: "서버 에러가 발생했습니다." });
  }
};
