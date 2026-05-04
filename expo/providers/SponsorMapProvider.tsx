import createContextHook from "@nkzw/create-context-hook";
import { useCallback, useState } from "react";

export const [SponsorMapProvider, useSponsorMap] = createContextHook(() => {
  const [visible, setVisible] = useState<boolean>(true);
  const toggle = useCallback(() => setVisible((v) => !v), []);
  return { visible, setVisible, toggle };
});
