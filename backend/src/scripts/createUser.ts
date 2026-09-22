// Creates (or updates the password of) an authorised login. This is the ONLY way to
// provision an account -- there is no public /register route, since this is a closed,
// internal tool.
//
// Usage: npm run create-user -- "name@hellocareconsulting.com" "a strong password" "Full Name"
import bcrypt from "bcryptjs";
import { config } from "../config";
import { sequelize, User } from "../models";

async function main() {
  const [email, password, name] = process.argv.slice(2);
  if (!email || !password || !name) {
    console.error('Usage: npm run create-user -- "email@hellocareconsulting.com" "password" "Full Name"');
    process.exit(1);
  }
  if (password.length < 10) {
    console.error("Password must be at least 10 characters.");
    process.exit(1);
  }

  await sequelize.authenticate();
  const passwordHash = await bcrypt.hash(password, config.bcryptSaltRounds);
  const [user, created] = await User.findOrCreate({
    where: { email: email.toLowerCase() },
    defaults: { email: email.toLowerCase(), passwordHash, name, isActive: true },
  });
  if (!created) {
    user.passwordHash = passwordHash;
    user.name = name;
    user.isActive = true;
    await user.save();
    console.log(`Updated existing user ${email}.`);
  } else {
    console.log(`Created user ${email}.`);
  }
  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
