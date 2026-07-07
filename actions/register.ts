"use server"

import bcrypt from "bcryptjs"
import * as z from "zod";

import { db } from "@/lib/db";
import { RegisterSchema } from "@/schemas";
import { getUserByEmail } from "@/data/user";
import { sendVerificationEmail } from "@/lib/mail";
import { generateVerificationToken } from "@/lib/tokens";
import { joinDefaultWorkspace } from "@/lib/workspace";

export const register = async (values: z.infer<typeof RegisterSchema>) => {
    const validatedFields = RegisterSchema.safeParse(values);

    if(!validatedFields.success){
        return { error: "入力に誤りがあります！" };
    }

    const { email, password, name } = validatedFields.data;
    const hashedPassword = await bcrypt.hash(password, 10);

    // const existingUser = await db.user.findUnique({
    //     where: {
    //         email,
    //     }
    // })
    //これの代わりに下の existingUser を使う

    const existingUser = await getUserByEmail(email);

    if ( existingUser ){
        return { error: "そのメールは既に使用されています！"}
    }

    const user = await db.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
        },
    });

    // 新規ユーザーは既定ワークスペース（放送部）に所属させる。
    // セルフサーブ作成・招待コードが入るまでの互換動作（従来の単一団体運用と同じ）。
    await joinDefaultWorkspace(user.id);

    const verificationToken  = await generateVerificationToken( email );
    await sendVerificationEmail(
        verificationToken.email,
        verificationToken.token,
    );

    return { success: "確認メールを送信しました！" };

    // revalidatePath();
    // revalidateTag();
}