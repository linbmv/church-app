import mongoose from "mongoose";

const peopleSchema = new mongoose.Schema(
  {
    // name: { type: String },
    // email: { type: String },
    // function: { type: String },
    // status: { type: String },
    // mobile: { type: String },

    Name: { type: String },
    NameChi: { type: String },
    Contact: { type: Number },
    District: { type: String },
    Address: { type: String },
    ProfilePic: { type: String, default: "" },

    // email_verified_at: { type: Date },
    // password: { required: true, type: String },
    // profile_image: { type: String },
    // created_at: { type: Date },
    // updated_at: { type: Date },
  },
  { strict: false, versionKey: false }
);
// peopleSchema.set("toJSON", { virtuals: true });

export const peopleModel = mongoose.model("People", peopleSchema, "people");
// peopleSchema.virtual("id").get(function () {
//   return this._id.toHexString();
// });

// export const peopleModel = mongoose.model("User", peopleSchema, "users");
