"use server";

import { revalidatePath } from "next/cache";
import User from "../models/user.models";
import { connectToDB } from "../mongoose";
import Nexio from "../models/nexio.models";
import { FilterQuery, SortOrder } from "mongoose";

interface Params {
  userId: string;
  username: string;
  name: string;
  bio: string;
  image: string;
  path: string;
}

export async function updateUser({
  userId,
  username,
  name,
  bio,
  image,
  path,
}: Params): Promise<void> {
  connectToDB();

  try {
    await User.findOneAndUpdate(
      { id: userId },
      { username: username.toLowerCase(), name, bio, image, onboarded: true },
      { upsert: true }
    );

    if (path === "/profile/edit") {
      revalidatePath(path);
    }
  } catch (error: any) {
    throw new Error(`Failed To Create & Update User : ${error.message}`);
  }
}

export async function fetchUser(userId: string) {
  try {
    connectToDB();
    return await User.findOne({ id: userId });
    // .populate({
    //   path:'communities',
    //   model:Community
    // })
  } catch (error: any) {
    throw new Error(`Failed To Fetch User : ${error.message}`);
  }
}

export async function fetchUserPosts(userId: string) {
  try {
    // Find all Nexios authored by user with the given userId
    const nexios = await User.findOne({
      id: userId,
    }).populate({
      path: "nexios",
      model: Nexio,
      populate: {
        path: "children",
        model: Nexio,
        populate: {
          path: "author",
          model: User,
          select: "name image id",
        },
      },
    });
    return nexios;
  } catch (error:any) {
    throw new Error(`Failed To Fetch User Posts: ${error.message}`)
  }
}

export async function fetchUsers({
  userId,
  searchString = "",
  pageNumber = 1,
  pageSize = 20,
  sortBy = "desc",
}: {
  userId: string;
  searchString?: string;
  pageNumber?: number;
  pageSize?: number;
  sortBy?: SortOrder;
}) {
  try {
    connectToDB();

    // Calculate the number of users to skip based on the page number and page size.
    const skipAmount = (pageNumber - 1) * pageSize;

    // Create a case-insensitive regular expression for the provided search string.
    const regex = new RegExp(searchString, "i");

    // Create an initial query object to filter users.
    const query: FilterQuery<typeof User> = {
      id: { $ne: userId }, // Exclude the current user from the results.
    };

    // If the search string is not empty, add the $or operator to match either username or name fields.
    if (searchString.trim() !== "") {
      query.$or = [
        { username: { $regex: regex } },
        { name: { $regex: regex } },
      ];
    }

    // Define the sort options for the fetched users based on createdAt field and provided sort order.
    const sortOptions = { createdAt: sortBy };

    const usersQuery = User.find(query)
      .sort(sortOptions)
      .skip(skipAmount)
      .limit(pageSize);

    // Count the total number of users that match the search criteria (without pagination).
    const totalUsersCount = await User.countDocuments(query);

    const users = await usersQuery.exec();

    // Check if there are more users beyond the current page.
    const isNext = totalUsersCount > skipAmount + users.length;

    return { users, isNext };
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
}


export async function getActivity(userId: string) {
  try {
    connectToDB();

    // Find all Nexios created by the user
    const userNexios = await Nexio.find({ author: userId });

    // Collect all the child thread ids (replies) from the 'children' field of each user thread
    const childNexioIds = userNexios.reduce((acc, userNexio) => {
      return acc.concat(userNexio.children);
    }, []);

    // Find and return the child Nexios (replies) excluding the ones created by the same user
    const replies = await Nexio.find({
      _id: { $in: childNexioIds },
      author: { $ne: userId }, // Exclude Nexios authored by the same user
    }).populate({
      path: "author",
      model: User,
      select: "name image _id",
    });

    return replies;
  } catch (error) {
    console.error("Error fetching replies: ", error);
    throw error;
  }
}
