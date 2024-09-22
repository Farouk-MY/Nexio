"use server";

import { revalidatePath } from "next/cache";

import { connectToDB } from "../mongoose";
import Nexio from "../models/nexio.models";
import User from "../models/user.models";
import Community from "../models/community.models";


export async function fetchPosts(pageNumber = 1, pageSize = 20) {
  connectToDB();

  // Calculate the number of posts to skip based on the page number and page size.
  const skipAmount = (pageNumber - 1) * pageSize;

  // Create a query to fetch the posts that have no parent (top-level Nexios) (a Nexio that is not a comment/reply).
  const postsQuery = Nexio.find({ parentId: { $in: [null, undefined] } })
    .sort({ createdAt: "desc" })
    .skip(skipAmount)
    .limit(pageSize)
    .populate({
      path: "author",
      model: User,
    })
    .populate({
      path: "community",
      model: Community,
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

interface Params {
  text: string,
  author: string,
  communityId: string | null,
  path: string,
}

export async function createNexio({ text, author, communityId, path }: Params) {
  try {
    connectToDB();

    const communityIdObject = await Community.findOne(
      { id: communityId },
      { _id: 1 }
    );

    const createdNexio = await Nexio.create({
      text,
      author,
      community: communityIdObject, // Assign communityId if provided, or leave it null for personal account
    });

    

    // Update User model
    await User.findByIdAndUpdate(author, {
      $push: { nexios: createdNexio._id },
    });

    if (communityIdObject) {
      // Update Community model
      await Community.findByIdAndUpdate(communityIdObject, {
        $push: { nexios: createdNexio._id },
      });
    }

    revalidatePath(path);
  } catch (error: any) {
    throw new Error(`Failed to create Nexio: ${error.message}`);
  }
}

async function fetchAllChildNexios(NexioId: string): Promise<any[]> {
  const childNexios = await Nexio.find({ parentId: NexioId });

  const descendantNexios = [];
  for (const childNexio of childNexios) {
    const descendants = await fetchAllChildNexios(childNexio._id);
    descendantNexios.push(childNexio, ...descendants);
  }

  return descendantNexios;
}

export async function deleteNexio(id: string, path: string): Promise<void> {
  try {
    connectToDB();

    // Find the Nexio to be deleted (the main Nexio)
    const mainNexio = await Nexio.findById(id).populate("author community");

    if (!mainNexio) {
      throw new Error("Nexio not found");
    }

    // Fetch all child Nexios and their descendants recursively
    const descendantNexios = await fetchAllChildNexios(id);

    // Get all descendant Nexio IDs including the main Nexio ID and child Nexio IDs
    const descendantNexioIds = [
      id,
      ...descendantNexios.map((Nexio) => Nexio._id),
    ];

    // Extract the authorIds and communityIds to update User and Community models respectively
    const uniqueAuthorIds = new Set(
      [
        ...descendantNexios.map((Nexio) => Nexio.author?._id?.toString()), // Use optional chaining to handle possible undefined values
        mainNexio.author?._id?.toString(),
      ].filter((id) => id !== undefined)
    );

    const uniqueCommunityIds = new Set(
      [
        ...descendantNexios.map((Nexio) => Nexio.community?._id?.toString()), // Use optional chaining to handle possible undefined values
        mainNexio.community?._id?.toString(),
      ].filter((id) => id !== undefined)
    );

    // Recursively delete child Nexios and their descendants
    await Nexio.deleteMany({ _id: { $in: descendantNexioIds } });

    // Update User model
    await User.updateMany(
      { _id: { $in: Array.from(uniqueAuthorIds) } },
      { $pull: { nexios: { $in: descendantNexioIds } } }
    );

    // Update Community model
    await Community.updateMany(
      { _id: { $in: Array.from(uniqueCommunityIds) } },
      { $pull: { nexios: { $in: descendantNexioIds } } }
    );

    revalidatePath(path);
  } catch (error: any) {
    throw new Error(`Failed to delete Nexio: ${error.message}`);
  }
}

export async function fetchNexioById(NexioId: string) {
  connectToDB();

  try {
    const nexio = await Nexio.findById(NexioId)
      .populate({
        path: "author",
        model: User,
        select: "_id id name image",
      })
      .populate({
        path: "community",
        model: Community,
        select: "_id id name image",
      })
      .populate({
        path: "children",
        populate: [
          {
            path: "author",
            model: User,
            select: "_id id name parentId image",
          },
          {
            path: "children",
            model: Nexio,
            populate: {
              path: "author",
              model: User,
              select: "_id id name parentId image",
            },
          },
        ],
      })
      .exec();

    // Log the fetched Nexio, including the community
    console.log("Fetched Nexio:", nexio);

    return nexio;
  } catch (err) {
    console.error("Error while fetching Nexio:", err);
    throw new Error("Unable to fetch Nexio");
  }
}


export async function addNexioComment(
  NexioId: string,
  commentText: string,
  userId: string,
  path: string
) {
  connectToDB();

  try {
    // Find the original Nexio by its ID
    const originalNexio = await Nexio.findById(NexioId);

    if (!originalNexio) {
      throw new Error("Nexio not found");
    }

    // Create the new comment Nexio
    const commentNexio = new Nexio({
      text: commentText,
      author: userId,
      parentId: NexioId, // Set the parentId to the original Nexio's ID
    });

    // Save the comment Nexio to the database
    const savedCommentNexio = await commentNexio.save();

    // Add the comment Nexio's ID to the original Nexio's children array
    originalNexio.children.push(savedCommentNexio._id);

    // Save the updated original Nexio to the database
    await originalNexio.save();

    revalidatePath(path);
  } catch (err) {
    console.error("Error while adding comment:", err);
    throw new Error("Unable to add comment");
  }
}