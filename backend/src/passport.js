import { ExtractJwt } from "passport-jwt";
import passportJWT from "passport-jwt";
import dotenv from "dotenv";
import passport from "passport";

import { peopleModel } from "./schemas/people.schema.js";
const JWTStrategy = passportJWT.Strategy;
dotenv.config();

passport.use(
  new JWTStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    },
    function (jwtPayload, done) {
      return peopleModel
        .findOne({ _id: jwtPayload.id })
        .then((people) => {
          return done(null, people);
        })
        .catch((err) => {
          return done(err);
        });
    }
  )
);
