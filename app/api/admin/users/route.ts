
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "../../../../src/lib/supabase/admin";

function getErrorDetails(error: any) {
  return {
    message: error?.message || "",
    code: error?.code || "",
    details: error?.details || "",
    hint: error?.hint || "",
    status: error?.status || "",
  };
}

// VERIFY ADMIN
async function verifyAdmin(request: NextRequest): Promise<{
  user: any | null;
  error: NextResponse | null;
}> {
  const authorization = request.headers.get("Authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return {
      user: null,
      error: NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      ),
    };
  }

  const token = authorization.replace("Bearer ", "");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return {
      user: null,
      error: NextResponse.json(
        { error: "Supabase configuration is missing." },
        { status: 500 }
      ),
    };
  }

  const authClient = createClient(supabaseUrl, supabaseKey);

  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser(token);

  if (authError || !user) {
    return {
      user: null,
      error: NextResponse.json(
        { error: "Invalid or expired session." },
        { status: 401 }
      ),
    };
  }

  const userClient = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });

  const { data: isAdmin, error: adminError } =
    await userClient.rpc("is_current_user_admin");

  if (adminError || isAdmin !== true) {
    return {
      user: null,
      error: NextResponse.json(
        { error: "Only administrators can perform this action." },
        { status: 403 }
      ),
    };
  }

  return { user, error: null };
}

// CREATE USER
export async function POST(request: NextRequest) {
  let createdUserId: string | null = null;

  try {
    const verification = await verifyAdmin(request);

    if (verification.error) return verification.error;

    const body = await request.json();

    const fullName =
      typeof body.full_name === "string" ? body.full_name.trim() : "";

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string" ? body.password : "";

    const role = body.role;

    if (!fullName || !email || !password || !role) {
      return NextResponse.json(
        { error: "Name, email, password and role are required." },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must contain at least 8 characters." },
        { status: 400 }
      );
    }

    if (!["admin", "instructor", "student"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid user role." },
        { status: 400 }
      );
    }

    const { data: authData, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
        user_metadata: { full_name: fullName },
      });

    if (createError || !authData.user) {
      return NextResponse.json(
        { error: createError?.message || "Could not create user." },
        { status: 400 }
      );
    }

    createdUserId = authData.user.id;

    // The database trigger creates the profile automatically.
    const { data: updatedProfile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .update({
          email,
          full_name: fullName,
          role,
          status: "active",
        })
        .eq("id", createdUserId)
        .select("id")
        .maybeSingle();

    if (profileError || !updatedProfile) {
      console.error(
        "Create profile error:",
        getErrorDetails(profileError)
      );

      await supabaseAdmin.auth.admin.deleteUser(createdUserId);
      createdUserId = null;

      return NextResponse.json(
        {
          error:
            profileError?.message ||
            "Profile was not created by the database trigger.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "User created successfully." },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create user API error:", getErrorDetails(error));

    if (createdUserId) {
      await supabaseAdmin.auth.admin.deleteUser(createdUserId);
    }

    return NextResponse.json(
      { error: error?.message || "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}

// UPDATE USER
export async function PATCH(request: NextRequest) {
  try {
    const verification = await verifyAdmin(request);

    if (verification.error) return verification.error;

    const body = await request.json();

    const id = typeof body.id === "string" ? body.id.trim() : "";

    const fullName =
      typeof body.full_name === "string" ? body.full_name.trim() : "";

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const role = body.role;
    const status = body.status;

    if (!id || !fullName || !email || !role || !status) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address." },
        { status: 400 }
      );
    }

    if (!["admin", "instructor", "student"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role." },
        { status: 400 }
      );
    }

    if (!["active", "inactive"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status." },
        { status: 400 }
      );
    }

    const { data: existing, error: findError } =
      await supabaseAdmin
        .from("profiles")
        .select("id,email,full_name,role,status")
        .eq("id", id)
        .maybeSingle();

    if (findError) throw findError;

    if (!existing) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    if (
      id === verification.user.id &&
      (role !== "admin" || status !== "active")
    ) {
      return NextResponse.json(
        {
          error:
            "You cannot demote or deactivate your own admin account.",
        },
        { status: 400 }
      );
    }

    if (
      existing.role === "admin" &&
      (role !== "admin" || status !== "active")
    ) {
      const { count, error: countError } = await supabaseAdmin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin")
        .eq("status", "active");

      if (countError) throw countError;

      if ((count || 0) <= 1) {
        return NextResponse.json(
          {
            error:
              "You cannot deactivate the last active administrator.",
          },
          { status: 400 }
        );
      }
    }

    const authUpdates: {
      email?: string;
      email_confirm?: boolean;
      ban_duration?: string;
      user_metadata: { full_name: string };
    } = {
      user_metadata: { full_name: fullName },
    };

    if (email !== existing.email) {
      authUpdates.email = email;
      authUpdates.email_confirm = true;
    }

    if (status !== existing.status) {
      authUpdates.ban_duration =
        status === "inactive" ? "876000h" : "none";
    }

    const { error: authUpdateError } =
      await supabaseAdmin.auth.admin.updateUserById(id, authUpdates);

    if (authUpdateError) {
      return NextResponse.json(
        { error: authUpdateError.message },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } =
      await supabaseAdmin
        .from("profiles")
        .update({ full_name: fullName, email, role, status })
        .eq("id", id)
        .select("id,full_name,email,role,status,created_at")
        .maybeSingle();

    if (updateError || !updated) {
      console.error(
        "Profile update error:",
        getErrorDetails(updateError)
      );

      await supabaseAdmin.auth.admin.updateUserById(id, {
        email: existing.email || undefined,
        email_confirm: true,
        ban_duration:
          existing.status === "inactive" ? "876000h" : "none",
        user_metadata: {
          full_name: existing.full_name || "",
        },
      });

      return NextResponse.json(
        { error: updateError?.message || "Profile update failed." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "User updated successfully.",
        user: updated,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Update user API error:", getErrorDetails(error));

    return NextResponse.json(
      { error: error?.message || "Something went wrong." },
      { status: 500 }
    );
  }
}

// DELETE USER
export async function DELETE(request: NextRequest) {
  let currentStage = "Starting delete operation";

  try {
    // 1. Verify administrator
    currentStage = "Verifying administrator";

    const verification = await verifyAdmin(request);

    if (verification.error) return verification.error;

    // 2. Read target user ID
    currentStage = "Reading request body";

    const body = await request.json();

    const id = typeof body.id === "string" ? body.id.trim() : "";

    if (!id) {
      return NextResponse.json(
        { error: "User ID is required." },
        { status: 400 }
      );
    }

    if (id === verification.user.id) {
      return NextResponse.json(
        { error: "You cannot delete your own admin account." },
        { status: 400 }
      );
    }

    // 3. Find target profile
    currentStage = "Finding target user";

    const { data: targetUser, error: findError } =
      await supabaseAdmin
        .from("profiles")
        .select("id,full_name,email,role,status")
        .eq("id", id)
        .maybeSingle();

    if (findError) throw findError;

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    // 4. Protect the last active administrator
    currentStage = "Checking last active administrator";

    if (
      targetUser.role === "admin" &&
      targetUser.status === "active"
    ) {
      const { count, error: countError } = await supabaseAdmin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin")
        .eq("status", "active");

      if (countError) throw countError;

      if ((count || 0) <= 1) {
        return NextResponse.json(
          {
            error:
              "You cannot delete the last active administrator.",
          },
          { status: 400 }
        );
      }
    }

    // 5. Protect instructors who own courses
    currentStage = "Checking instructor courses";

    if (targetUser.role === "instructor") {
      const { data: instructorCourse, error: courseError } =
        await supabaseAdmin
          .from("courses")
          .select("id")
          .eq("instructor_id", id)
          .limit(1)
          .maybeSingle();

      if (courseError) {
        console.error(
          "Instructor course check failed:",
          getErrorDetails(courseError)
        );

        return NextResponse.json(
          {
            error: "Could not verify instructor courses.",
            stage: currentStage,
            details: getErrorDetails(courseError),
          },
          { status: 500 }
        );
      }

      if (instructorCourse) {
        return NextResponse.json(
          {
            error:
              "This instructor owns courses. Reassign those courses before deleting this user.",
          },
          { status: 409 }
        );
      }
    }

    // 6. Delete Auth account
    currentStage = "Deleting user from Supabase Authentication";

    const { error: authDeleteError } =
      await supabaseAdmin.auth.admin.deleteUser(id);

    if (authDeleteError) {
      console.error(
        "Authentication deletion error:",
        getErrorDetails(authDeleteError)
      );

      return NextResponse.json(
        {
          error:
            authDeleteError.message || "Authentication deletion failed.",
          stage: currentStage,
          details: getErrorDetails(authDeleteError),
        },
        { status: 400 }
      );
    }

    // 7. Check whether the database already removed the profile
    currentStage = "Checking remaining user profile";

    const { data: remainingProfile, error: checkProfileError } =
      await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("id", id)
        .maybeSingle();

    if (checkProfileError) {
      console.error(
        "Profile check failed after Auth deletion:",
        getErrorDetails(checkProfileError)
      );

      return NextResponse.json(
        {
          error:
            "Authentication account was deleted, but profile verification failed. Please check the database.",
          stage: currentStage,
          details: getErrorDetails(checkProfileError),
        },
        { status: 500 }
      );
    }

    // 8. If profile still exists, delete it manually
    if (remainingProfile) {
      currentStage = "Removing remaining user profile";

      const { error: profileDeleteError } = await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("id", id);

      if (profileDeleteError) {
        console.error(
          "Profile deletion failed:",
          getErrorDetails(profileDeleteError)
        );

        return NextResponse.json(
          {
            error:
              "Authentication account was deleted, but profile cleanup failed.",
            stage: currentStage,
            details: getErrorDetails(profileDeleteError),
          },
          { status: 500 }
        );
      }
    }

    // 9. Final verification
    currentStage = "Final profile verification";

    const { data: finalProfile, error: finalCheckError } =
      await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("id", id)
        .maybeSingle();

    if (finalCheckError) throw finalCheckError;

    if (finalProfile) {
      return NextResponse.json(
        {
          error: "User profile still exists after deletion.",
          stage: currentStage,
        },
        { status: 500 }
      );
    }

    console.log("User deleted successfully:", id);

    return NextResponse.json(
      {
        message: "User deleted successfully.",
        deletedUserId: id,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Delete user API failed:", {
      stage: currentStage,
      error: getErrorDetails(error),
      rawError: error,
    });

    return NextResponse.json(
      {
        error: error?.message || "An unexpected server error occurred.",
        stage: currentStage,
        details: getErrorDetails(error),
      },
      { status: 500 }
    );
  }
}
