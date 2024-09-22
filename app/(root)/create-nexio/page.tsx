import PostNexio from '@/components/forms/PostNexio';
import { fetchUser } from '@/lib/actions/user.actions';
import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import React from 'react';

const Page = async () => {
  const user = await currentUser();
  if (!user) return null;

  const userInfo = await fetchUser(user.id);
  if (!userInfo?.onboarded) redirect('/onboarding');

  return (
    <>
      <h1 className="head-text">Create Nexio</h1>
      {/* Pass the correct user info as props */}
      <PostNexio userId={userInfo._id} />
    </>
  );
};

export default Page;
