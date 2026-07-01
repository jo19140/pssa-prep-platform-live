"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createBrowserVadListenDeps,
  initialVadListenSnapshot,
  VadListenController,
  type VadListenControllerDeps,
  type VadListenControllerOptions,
  type VadListenSnapshot,
  type VadListenWordContext,
} from "@/lib/voice/vadListenController";

type UseVadListenControllerOptions = VadListenControllerOptions;

type VadListenControllerLifecycleOptions = {
  deps: VadListenControllerDeps;
  getOptions: () => UseVadListenControllerOptions;
  setState: (state: VadListenSnapshot) => void;
  createController?: (options: VadListenControllerOptions, deps: VadListenControllerDeps) => VadListenController;
};

export function createVadListenControllerLifecycle({
  deps,
  getOptions,
  setState,
  createController = (options, controllerDeps) => new VadListenController(options, controllerDeps),
}: VadListenControllerLifecycleOptions) {
  let controller: VadListenController | null = null;

  const activeController = () => {
    const current = controller;
    current?.updateOptions(getOptions());
    current?.updateDeps(deps);
    return current;
  };

  return {
    setup() {
      const current = createController(getOptions(), deps);
      controller = current;
      setState(current.getSnapshot());
      const unsubscribe = current.subscribe(setState);
      return () => {
        unsubscribe();
        current.dispose();
        if (controller === current) controller = null;
      };
    },
    updateOptions() {
      controller?.updateOptions(getOptions());
      controller?.updateDeps(deps);
    },
    handleWordTap(word: string, context: VadListenWordContext) {
      return activeController()?.handleWordTap(word, context);
    },
    stopEarly(word: string, context: VadListenWordContext) {
      return activeController()?.stopEarly(word, context);
    },
    acceptFallback(word: string) {
      return activeController()?.acceptFallback(word);
    },
    dispose() {
      controller?.dispose();
      controller = null;
    },
    getControllerForTests() {
      return controller;
    },
  };
}

export function useVadListenController(options: UseVadListenControllerOptions) {
  const [state, setState] = useState<VadListenSnapshot>(initialVadListenSnapshot);
  const latestOptionsRef = useRef(options);
  const depsRef = useRef<VadListenControllerDeps | null>(null);
  const lifecycleRef = useRef<ReturnType<typeof createVadListenControllerLifecycle> | null>(null);

  latestOptionsRef.current = options;

  if (!depsRef.current) {
    depsRef.current = createBrowserVadListenDeps();
  }

  if (!lifecycleRef.current) {
    lifecycleRef.current = createVadListenControllerLifecycle({
      deps: depsRef.current,
      getOptions: () => latestOptionsRef.current,
      setState,
    });
  }

  useEffect(() => {
    lifecycleRef.current?.updateOptions();
  }, [options]);

  useEffect(() => {
    return lifecycleRef.current!.setup();
  }, []);

  const handleWordTap = useCallback(
    (word: string, context: VadListenWordContext) => lifecycleRef.current?.handleWordTap(word, context),
    [],
  );
  const stopEarly = useCallback((word: string, context: VadListenWordContext) => lifecycleRef.current?.stopEarly(word, context), []);
  const acceptFallback = useCallback((word: string) => lifecycleRef.current?.acceptFallback(word), []);
  const dispose = useCallback(() => lifecycleRef.current?.dispose(), []);

  return {
    state,
    handleWordTap,
    stopEarly,
    acceptFallback,
    dispose,
  };
}
