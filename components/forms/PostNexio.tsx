"use client";

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
import { Textarea } from "@/components/ui/textarea";
import { usePathname, useRouter } from "next/navigation";
import { nexioValidation } from "@/lib/validations/nexio";
import { createNexio } from "@/lib/actions/nexio.actions";
import { useOrganization } from "@clerk/nextjs";

// Expect userId as a prop from the server-side component
const PostNexio = ({ userId }: { userId: string }) => {
  const router = useRouter();
  const pathname = usePathname();
  const {organization} = useOrganization()

  const form = useForm({
    resolver: zodResolver(nexioValidation),
    defaultValues: {
      nexio: "",
      accountId: userId,
    },
  });

  // Form submission logic
  const onSubmit = async (values: z.infer<typeof nexioValidation>) => {
    await createNexio({
      text: values.nexio,
      author: userId,
      communityId: organization ? organization.id : null,
      path: pathname,
    });
    router.push("/");
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="mt-10 flex flex-col justify-start gap-10"
      >
        <FormField
          control={form.control}
          name="nexio"
          render={({ field }) => (
            <FormItem className="flex w-full flex-col gap-3">
              <FormLabel className="text-base-semibold text-light-2">
                Content
              </FormLabel>
              <FormControl className="no-focus border border-dark-4 bg-dark-3 text-light-1">
                <Textarea rows={15} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="bg-primary-500">
          Post Nexio
        </Button>
      </form>
    </Form>
  );
};

export default PostNexio;
