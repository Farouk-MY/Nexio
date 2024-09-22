"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { usePathname, useRouter } from "next/navigation";
import { commentValidation } from "@/lib/validations/nexio";
import Image from "next/image";
import { addNexioComment } from "@/lib/actions/nexio.actions";
// import { createNexio } from "@/lib/actions/nexio.actions";

interface Props {
  nexioId: string;
  currentUserImg: string;
  currentUserId: string;
}

const Comment = ({ nexioId, currentUserImg, currentUserId }: Props) => {
  
    const router = useRouter();
  const pathname = usePathname();

  const form = useForm({
    resolver: zodResolver(commentValidation),
    defaultValues: {
      nexio: "",
    },
  });

  // Form submission logic
  const onSubmit = async (values: z.infer<typeof commentValidation>) => {
    await addNexioComment(
      nexioId,
      values.nexio,
      JSON.parse(currentUserId),
      pathname,
    );
    form.reset()
  };

    return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="comment-form"
      >
        <FormField
          control={form.control}
          name="nexio"
          render={({ field }) => (
            <FormItem className="flex w-full items-center gap-3">
              <FormLabel>
                <Image
                    src={currentUserImg}
                    alt="Profile Image"
                    width={48}
                    height={48}
                    className="rounded-full object-cover"
                />
              </FormLabel>
              <FormControl className="border-none bg-transparent">
                <Input type="text" placeholder="Comment..." className='no-focus text-light-1 outline-none' {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit" className="comment-form_btn">
          Comment Nexio
        </Button>
      </form>
    </Form>
  );
};

export default Comment;
