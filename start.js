const { spawn } = require("child_process");

function startProcess(command, args, options) {
  const process = spawn(command, args, options);

  process.stdout.on("data", (data) => {
    console.log(`[${options.cwd}] ${data}`);
  });

  process.stderr.on("data", (data) => {
    console.error(`[${options.cwd}] ${data}`);
  });

  process.on("close", (code) => {
    console.log(`[${options.cwd}] process exited with code ${code}`);
  });

  return process;
}

// Start the backend
startProcess("npm", ["run", "start:dev"], { cwd: "./backend", shell: true });

// Start the frontend
startProcess("npm", ["start", "dev"], { cwd: "./frontend", shell: true });
