"use server";

import { revalidatePath } from "next/cache";
import Nexio from "../models/nexio.models";
import User from "../models/user.models";
import { connectToDB } from "../mongoose";

interface Params {
  text: string;
  author: string;
  communityId: string | null;
  path: string;
}

export async function createNexio({ text, author, communityId, path }: Params) {
  try {
    connectToDB();

    const createdNexio = await Nexio.create({
      text,
      author,
      community: null,
    });

    // Update User Model
    await User.findByIdAndUpdate(author, {
      $push: {
        nexios: createdNexio._id,
      },
    });
  } catch (error: any) {
    throw new Error(`Error Creating Nexio : ${error.message}`);
  }
}

export async function fetchPosts(pageNumber = 10, pageSize = 20) {
  connectToDB();

  const skipAmount = (pageNumber - 1) * pageSize;

  // Create a query to fetch the posts that have no parent (top-level threads) (a thread that is not a comment/reply).
  const postsQuery = Nexio.find({ parentId: { $in: [null, undefined] } })
    .sort({ createdAt: "desc" })
    .skip(skipAmount)
    .limit(pageSize)
    .populate({
      path: "author",
      model: User,
    })
    .populate({
      path: "children", // Populate the children field
      populate: {
        path: "author", // Populate the author field within children
        model: User,
        select: "_id name parentId image", // Select only _id and username fields of the author
      },
    });

  // Count the total number of top-level posts (Nexios) i.e., Nexios that are not comments.
  const totalPostsCount = await Nexio.countDocuments({
    parentId: { $in: [null, undefined] },
  }); // Get the total count of posts

  const posts = await postsQuery.exec();

  const isNext = totalPostsCount > skipAmount + posts.length;

  return { posts, isNext };
}

export async function fetchNexioById(id: string) {
  connectToDB();

  try {
    const nexio = await Nexio.findById(id)
      .populate({
        path: "author",
        model: User,
        select: "_id id name image",
      }) // Populate the author field with _id and username
      .populate({
        path: "children", // Populate the children field
        populate: [
          {
            path: "author", // Populate the author field within children
            model: User,
            select: "_id id name parentId image", // Select only _id and username fields of the author
          },
          {
            path: "children", // Populate the children field within children
            model: Nexio, // The model of the nested children (assuming it's the same "Thread" model)
            populate: {
              path: "author", // Populate the author field within nested children
              model: User,
              select: "_id id name parentId image", // Select only _id and username fields of the author
            },
          },
        ],
      })
      .exec();

    return nexio;
  } catch (err) {
    console.error("Error while fetching nexio :", err);
    throw new Error("Unable to fetch nexio");
  }
}

export async function addNexioComment(nexioId:string, commentText:string,userId:string,path:string) {
  connectToDB()
  try {
    // Find Original Nexio By Id
    const originalNexio = await Nexio.findById(nexioId)
    if(!originalNexio){
      throw new Error("Nexio Not Found")
    }

    //Create New Nexio With the comment Text
    const commentNexio = new Nexio({
      text:commentText,
      author:userId,
      parentId:nexioId
    })

    // Save The New Nexio
    const savedCommentNexio = await commentNexio.save()

    // Update the original nexio to include the new comment
    originalNexio.children.push(savedCommentNexio._id)
    
    // Save The Original Nexio
    await originalNexio.save()

    revalidatePath(path)
  
  
  } catch (error:any) {
    throw new  Error(`Unable to add comment : ${error.message}`);
  }
}

