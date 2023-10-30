import apiLimits from "../configs/apiLimits.json";

type Api = {
  maxCallsPerSecond: number;
  maxCallStackSize: number;
};

type ApiLimits = {
  [key: string]: Api;
};

type CallStacks = {
  [key: string]: {
    stack: Function[];
    executed: number;
  };
};

const callStacks: CallStacks = {};

export const getCallStack = (apiName: string) => {
  if (!callStacks[apiName]) callStacks[apiName] = { stack: [], executed: 0 };
  return callStacks[apiName];
};

export const getStackSize = (apiName: string) => {
  const callStack = getCallStack(apiName);
  return callStack.stack.length;
};

export const execWithRateLimit = async (fn: Function, apiName: string) => {
  const maxCallsPerSecond = (apiLimits as ApiLimits)[apiName].maxCallsPerSecond;
  if (!maxCallsPerSecond) {
    throw new Error(`No limit defined for ${apiName} API`);
  }
  const callStack = getCallStack(apiName);
  const executed = callStack.executed;
  if (executed < maxCallsPerSecond) {
    callStack.executed++;
    return fn();
  }
  callStack.stack.push(fn);
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      if (callStack.executed < maxCallsPerSecond) {
        clearInterval(interval);
        callStack.executed++;
        const fn = callStack.stack.shift();
        if (fn) resolve(fn());
      }
    }, 100);
  });
};

export const execIfStackNotFull = async (fn: Function, apiName: string) => {
  const maxCallStackSize = (apiLimits as ApiLimits)[apiName].maxCallStackSize;
  if (!maxCallStackSize) {
    throw new Error(`No limit defined for ${apiName} API`);
  }
  const callStack = getCallStack(apiName);
  if (callStack.stack.length < maxCallStackSize) {
    callStack.stack.push(fn);
    return execWithRateLimit(fn, apiName);
  }
  return null;
};

export const cleanStacks = () => {
  setInterval(() => {
    for (let apiName in callStacks) {
      const callStack = callStacks[apiName];
      callStack.executed = 0;
    }
  }, 1000);
};
