import { fetchUserPosts } from "@/lib/actions/user.actions";
import { redirect } from "next/navigation";
import React from "react";
import NexioCard from "../cards/NexioCard";
interface Props {
  currentUserId: string;
  accountId: string;
  accountType: string;
}
const NexiosTab = async({ currentUserId, accountId, accountType }: Props) => {
    let result = await fetchUserPosts(accountId)
    if(!result) redirect('/')

    return (
        <section className='mt-9 flex flex-col gap-10'>
            {result.nexios.map((nexio:any)=>(
                <NexioCard
                key={nexio._id}
                id={nexio._id}
                currentUserId={currentUserId}
                parentId={nexio.parentId}
                content={nexio.text}
                author={accountType==='User' ? {
                    name:result.name,
                    image:result.image,
                    id:result.id
                }:{
                    name:nexio.author.name,
                    image:nexio.author.image,
                    id:nexio.author.id
                }}
                community={nexio.community}
                createdAt={nexio.createdAt}
                comments={nexio.children}
              />
            ))}
        </section>
    );
};

export default NexiosTab;
