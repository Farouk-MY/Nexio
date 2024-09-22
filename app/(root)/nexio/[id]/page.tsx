import NexioCard from "@/components/cards/NexioCard";
import Comment from "@/components/forms/Comment";
import { fetchNexioById } from "@/lib/actions/nexio.actions";
import { fetchUser } from "@/lib/actions/user.actions";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import React from "react";

const Page = async ({ params }: { params: { id: string } }) => {
  if (!params.id) return null;
  const user = await currentUser(); // Make sure currentUser() resolves before accessing user properties
  if (!user) return null; // Ensure user exists and has an id

  const userInfo = await fetchUser(user.id); // Wait for fetchUser to resolve
  if (!userInfo?.onboarded) redirect("/onboarding"); // Redirect if user is not onboarded

  const nexio = await fetchNexioById(params.id); // Fetch nexio data by id

  return (
    <section className="relative">
      <NexioCard
        key={nexio._id}
        id={nexio._id}
        currentUserId={user?.id || ""}
        parentId={nexio.parentId}
        content={nexio.text}
        author={nexio.author}
        community={nexio.community}
        createdAt={nexio.createdAt}
        comments={nexio.children}
      />

      <div className="mt-7 ">
        <Comment
          nexioId={nexio.id}
          currentUserImg={userInfo.image}
          currentUserId={JSON.stringify(userInfo._id)}
        />
      </div>

      <div className="mt-10">
        {nexio.children.map((childIteam: any) => (
          <NexioCard
            key={childIteam._id}
            id={childIteam._id}
            currentUserId={childIteam?.id || ""}
            parentId={childIteam.parentId}
            content={childIteam.text}
            author={childIteam.author}
            community={childIteam.community}
            createdAt={childIteam.createdAt}
            comments={childIteam.children}
            isComment
          />
        ))}
      </div>
    </section>
  );
};

export default Page;
