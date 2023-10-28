import apiLimits from "../configs/apiLimits.json";

type ApiLimits = {
  [key: string]: number;
};

type CallStacks = {
  [key: string]: {
    stack: Function[];
    executed: number;
  };
};

const callStacks: CallStacks = {};

export const execWithRateLimit = async (fn: Function, apiName: string) => {
  const limit = (apiLimits as ApiLimits)[apiName];
  if (!limit) {
    throw new Error(`No limit defined for ${apiName} API`);
  }
  if (!callStacks[apiName]) callStacks[apiName] = { stack: [], executed: 0 };
  const callStack = callStacks[apiName];
  const executed = callStack.executed;
  if (executed < limit) {
    callStack.executed++;
    return fn();
  }
  callStack.stack.push(fn);
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      if (callStack.executed < limit) {
        clearInterval(interval);
        callStack.executed++;
        const fn = callStack.stack.shift();
        if (fn) resolve(fn());
      }
    }, 100);
  });
};

export const cleanStacks = () => {
  setInterval(() => {
    for (let apiName in callStacks) {
      const callStack = callStacks[apiName];
      callStack.executed = 0;
    }
  }, 1000);
};
