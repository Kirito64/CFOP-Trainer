import { useEffect, useState } from "react";
import { Button, Section } from "../../components/ui";
import { isSolved } from "../../lib/cube3";
import { saveAddress, savedAddress } from "../../lib/smartcube/address";
import { bluetoothSupported, connectCube, disconnectCube, markCubeSolved, onCubeMove, useCube } from "../../lib/smartcube/connection";

export function SmartCubeSection() {
  const cube = useCube();
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => onCubeMove((move) => setRecent((r) => [...r.slice(-15), move])), []);
  useEffect(() => {
    if (cube.status !== "connected") setRecent([]);
  }, [cube.status]);

  return (
    <div id="smart-cube" className="scroll-mt-6">
      <Section title="Smart cube">
        <p className="mb-4 max-w-[65ch] text-ink-2">
          Connect a Bluetooth cube and the timer works out your cross, F2L, OLL and PLL splits from your turns, and stops by itself when the cube is
          solved. Works with QiYi, GAN, GoCube, Giiker and MoYu smart cubes.
        </p>

        {!bluetoothSupported() ? (
          <p className="rounded-lg border border-dashed border-rule px-4 py-3 text-sm text-ink-2">
            This browser can't connect to Bluetooth cubes. Use Chrome or Edge on a computer or an Android phone. Safari, including every browser on
            iPhone, doesn't support it.
          </p>
        ) : cube.status === "connected" ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <p className="flex items-center gap-2 font-semibold">
                <span aria-hidden className="size-2.5 rounded-full bg-ready" />
                {cube.name}
              </p>
              {cube.battery != null && <p className="text-sm text-ink-2">Battery {cube.battery}%</p>}
              <p className="text-sm text-ink-2">{isSolved(cube.facelets) ? "Solved" : "Scrambled"}</p>
            </div>
            <div>
              <p className="text-sm text-ink-2">Turn a face to check it's working:</p>
              <p className="alg mt-1 min-h-[1.6em] text-lg" aria-live="polite">
                {recent.length ? recent.join(" ") : <span className="text-ink-3">No turns yet</span>}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {cube.canReset && (
                <Button onClick={() => void markCubeSolved()} title="Use this when the cube is solved but the app thinks it isn't">
                  My cube is solved
                </Button>
              )}
              <Button variant="quiet" onClick={() => void disconnectCube()}>
                Disconnect
              </Button>
            </div>
            {cube.canReset && (
              <p className="max-w-[65ch] text-sm text-ink-3">
                If the app ever thinks your solved cube is scrambled, solve it and press My cube is solved. That happens when the cube missed a turn.
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" onClick={() => void connectCube()} disabled={cube.status === "connecting"}>
                {cube.status === "connecting" ? "Connecting…" : "Connect cube"}
              </Button>
              {cube.status === "connecting" && <p className="text-sm text-ink-2">{cube.message}</p>}
              {cube.status === "idle" && <p className="text-sm text-ink-3">Turn a face first to wake the cube up.</p>}
            </div>
            {cube.status === "error" && (
              <p role="alert" className="max-w-[65ch] text-sm text-hold">
                Couldn't connect: {cube.message}
              </p>
            )}
            {(cube.status === "error" && cube.needsAddress) || savedAddress() ? <AddressField /> : null}
          </div>
        )}
      </Section>
    </div>
  );
}

/** Some QiYi cubes need their Bluetooth address before they'll talk, and Chrome can't always read it. */
function AddressField() {
  const [value, setValue] = useState(savedAddress() ?? "");
  const valid = /^([0-9A-F]{2}[:-]){5}[0-9A-F]{2}$/i.test(value.trim());
  return (
    <form
      className="flex max-w-[65ch] flex-col gap-2 rounded-lg border border-rule p-4"
      onSubmit={(e) => {
        e.preventDefault();
        saveAddress(value);
        void connectCube();
      }}
    >
      <label htmlFor="cube-address" className="font-medium">
        Your cube's Bluetooth address
      </label>
      <p className="text-sm text-ink-2">
        Chrome couldn't read it by itself. With the cube on, open <code>chrome://bluetooth-internals</code> in a new tab, find the cube under Devices,
        and copy its address here.
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          id="cube-address"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="AB:CD:EF:12:34:56"
          spellCheck={false}
          className="w-52 rounded-md border border-rule bg-panel px-3 py-2 font-mono"
        />
        <Button type="submit" disabled={!valid}>
          Save and connect
        </Button>
        {savedAddress() && (
          <Button variant="quiet" onClick={() => (saveAddress(""), setValue(""))}>
            Forget address
          </Button>
        )}
      </div>
    </form>
  );
}
