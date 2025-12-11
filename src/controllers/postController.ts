import type { Request, Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware.js";
import Post from "../models/Post.js";
// @desc    Create a new post
// @route   POST /api/posts
// @access  Private
export const createPost = async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, boardType } = req.body;
    const user = req.user;

    // 1. 필수 정보 확인
    if (!title || !content || !boardType) {
      return res
        .status(400)
        .json({ message: "제목, 내용, 게시판 종류를 모두 입력해주세요." });
    }
    if (!user) {
      return res
        .status(401)
        .json({ message: "사용자 정보를 찾을 수 없습니다." });
    }

    // 2. 새 게시글 생성
    const newPost = new Post({
      title,
      content,
      boardType,
      user: user._id, // 글쓴이는 바로 지금 로그인한 사용자
    });

    // 3. DB에 저장
    await newPost.save();
    res.status(201).json(newPost);
  } catch (error) {
    console.error("게시글 생성 에러:", error);
    res.status(500).json({ message: "서버 에러가 발생했습니다." });
  }
};

// @desc    Get all posts
// @route   GET /api/posts
// @access  Public
export const getPosts = async (req: Request, res: Response) => {
  try {
    // 1. DB에서 모든 게시글을 찾음
    //    .sort({ createdAt: -1 }) : 최신순으로 정렬
    //    .populate('user', 'nickname email'): 글쓴이의 ID만 저장되어 있는데,
    //    그 ID를 가지고 User 모델에 가서 'nickname'과 'email' 정보를 '채워서' 보여줌
    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .populate("user", "nickname email");

    res.status(200).json(posts);
  } catch (error) {
    console.error("게시글 목록 조회 에러:", error);
    res.status(500).json({ message: "서버 에러가 발생했습니다." });
  }
};

// @desc    Get a single post by ID
// @route   GET /api/posts/:id
// @access  Public
export const getPostById = async (req: Request, res: Response) => {
  try {
    const post = await Post.findById(req.params.id).populate(
      "user",
      "nickname email"
    );

    if (post) {
      res.status(200).json(post);
    } else {
      res.status(404).json({ message: "게시글을 찾을 수 없습니다." });
    }
  } catch (error) {
    console.error("게시글 상세 조회 에러:", error);
    res.status(500).json({ message: "서버 에러가 발생했습니다." });
  }
};

// @desc    Update a post
// @route   PUT /api/posts/:id
// @access  Private
export const updatePost = async (req: AuthRequest, res: Response) => {
  try {
    const { title, content } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "게시글을 찾을 수 없습니다." });
    }

    // 글쓴이 본인인지 확인
    // post.user가 ObjectId를 가지고 있으므로 .toString() 바로 사용 가능
    if (post.user.toString() !== req.user?._id.toString()) {
      return res
        .status(403)
        .json({ message: "게시글을 수정할 권한이 없습니다." });
    }

    post.title = title || post.title;
    post.content = content || post.content;

    const updatedPost = await post.save();
    res.status(200).json(updatedPost);
  } catch (error) {
    console.error("게시글 수정 에러:", error);
    res.status(500).json({ message: "서버 에러가 발생했습니다." });
  }
};

// @desc    Delete a post
// @route   DELETE /api/posts/:id
// @access  Private
export const deletePost = async (req: AuthRequest, res: Response) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "게시글을 찾을 수 없습니다." });
    }

    // 글쓴이 본인인지 확인
    if (post.user.toString() !== req.user?._id.toString()) {
      return res
        .status(403)
        .json({ message: "게시글을 삭제할 권한이 없습니다." });
    }

    await post.deleteOne();
    res.status(200).json({ message: "게시글이 삭제되었습니다." });
  } catch (error) {
    console.error("게시글 삭제 에러:", error);
    res.status(500).json({ message: "서버 에러가 발생했습니다." });
  }
};
