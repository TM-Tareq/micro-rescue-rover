'use client';

import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import { Sliders } from 'lucide-react';

import {
  fetchServoStatus,
  ServoStatusData,
} from '@/lib/servo';


interface ServoStatusProps {
  pollIntervalMs?: number;
}


export const ServoStatus: React.FC<ServoStatusProps> = ({
  pollIntervalMs = 2500,
}) => {

  const [
    servoData,
    setServoData,
  ] = useState<ServoStatusData | null>(
    null
  );

  const [
    isOnline,
    setIsOnline,
  ] = useState(false);

  const [
    animatedNozzleAngle,
    setAnimatedNozzleAngle,
  ] = useState(90);

  const sweepDirectionRef =
    useRef<1 | -1>(1);


  useEffect(() => {

    let mounted = true;

    const load = async () => {

      const data =
        await fetchServoStatus();

      if (!mounted) {
        return;
      }

      if (data) {

        setServoData(
          data
        );

        setIsOnline(
          true
        );

      } else {

        setIsOnline(
          false
        );
      }
    };


    void load();

    const timer =
      window.setInterval(
        () => {
          void load();
        },
        pollIntervalMs
      );


    return () => {

      mounted = false;

      window.clearInterval(
        timer
      );
    };

  }, [
    pollIntervalMs,
  ]);


  useEffect(() => {

    const isSweeping =
      isOnline &&
      servoData?.nozzle?.sweep === true;

    const min =
      servoData?.nozzle?.sweep_min ?? 60;

    const max =
      servoData?.nozzle?.sweep_max ?? 120;


    if (!isSweeping) {

      const backendAngle =
        servoData?.nozzle?.commanded_angle;

      if (
        backendAngle !== null &&
        backendAngle !== undefined
      ) {

        setAnimatedNozzleAngle(
          backendAngle
        );
      }

      sweepDirectionRef.current =
        1;

      return;
    }


    setAnimatedNozzleAngle(
      (current) => {

        if (
          current < min ||
          current > max
        ) {

          return min;
        }

        return current;
      }
    );


    const timer =
      window.setInterval(
        () => {

          setAnimatedNozzleAngle(
            (current) => {

              let next =
                current +
                (
                  5 *
                  sweepDirectionRef.current
                );


              if (
                next >= max
              ) {

                next = max;

                sweepDirectionRef.current =
                  -1;

              } else if (
                next <= min
              ) {

                next = min;

                sweepDirectionRef.current =
                  1;
              }


              return next;
            }
          );
        },
        100
      );


    return () => {

      window.clearInterval(
        timer
      );
    };

  }, [
    isOnline,
    servoData?.nozzle?.sweep,
    servoData?.nozzle?.sweep_min,
    servoData?.nozzle?.sweep_max,
    servoData?.nozzle?.commanded_angle,
  ]);


  const compartmentAngle =
    isOnline
      ? (
          servoData?.compartment
            ?.commanded_angle ??
          null
        )
      : null;


  const isSweep =
    isOnline &&
    servoData?.nozzle?.sweep === true;


  const nozzleAngle =
    isSweep
      ? animatedNozzleAngle
      : (
          isOnline
            ? (
                servoData?.nozzle
                  ?.commanded_angle ??
                null
              )
            : null
        );


  const sweepMin =
    servoData?.nozzle?.sweep_min ?? 60;

  const sweepMax =
    servoData?.nozzle?.sweep_max ?? 120;


  const percentage = (
    angle: number | null,
    min = 60,
    max = 120
  ) => {

    if (
      angle === null ||
      !Number.isFinite(angle) ||
      max <= min
    ) {

      return 0;
    }


    const clamped =
      Math.min(
        Math.max(
          angle,
          min
        ),
        max
      );


    return (
      (
        clamped - min
      ) /
      (
        max - min
      )
    ) * 100;
  };


  const badge = (
    state: string | undefined,
    kind:
      | 'compartment'
      | 'nozzle'
      | 'pump'
  ) => {

    if (
      !isOnline ||
      !state ||
      state === 'UNKNOWN' ||
      state === 'OFFLINE'
    ) {

      return (
        <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
          {isOnline ? 'UNKNOWN' : 'OFFLINE'}
        </span>
      );
    }


    if (
      kind === 'pump'
    ) {

      if (
        state === 'ON'
      ) {

        return (
          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 animate-pulse">
            ON
          </span>
        );
      }

      return (
        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
          {state}
        </span>
      );
    }


    if (
      kind === 'nozzle' &&
      (
        isSweep ||
        state === 'SWEEP ACTIVE'
      )
    ) {

      return (
        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 animate-pulse">
          SWEEP ACTIVE
        </span>
      );
    }


    if (
      state === 'OPEN' ||
      state === 'CENTER'
    ) {

      return (
        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
          {state}
        </span>
      );
    }


    if (
      state === 'CLOSED'
    ) {

      return (
        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
          CLOSED
        </span>
      );
    }


    return (
      <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
        {state}
      </span>
    );
  };


  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col space-y-4">

      <div className="flex items-center justify-between border-b border-slate-100 pb-3">

        <div className="flex items-center space-x-2">

          <Sliders className="w-5 h-5 text-indigo-600" />

          <h2 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
            Servo Status
          </h2>

        </div>


        <div className="flex items-center space-x-2">

          <span
            className={`w-2 h-2 rounded-full ${
              isOnline
                ? 'bg-emerald-500 animate-pulse'
                : 'bg-slate-400'
            }`}
          />

          <span
            className={`font-mono text-[11px] font-bold uppercase ${
              isOnline
                ? 'text-emerald-700'
                : 'text-slate-500'
            }`}
          >
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </span>

        </div>

      </div>


      <div className="space-y-3">

        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5 space-y-3">

          <div className="flex items-center justify-between">

            <div>

              <div className="font-bold text-xs text-slate-800">
                Compartment Servo
              </div>

              <div className="font-mono text-[10px] text-slate-400">
                ESP32 GPIO 27
              </div>

            </div>

            {badge(
              servoData?.compartment?.state,
              'compartment'
            )}

          </div>


          <div className="flex items-end justify-between">

            <div>

              <span className="text-[10px] font-semibold text-slate-500 block uppercase tracking-wide">
                Commanded Angle
              </span>

              <span className="text-lg font-bold font-mono text-slate-800">
                {
                  compartmentAngle !== null
                    ? `${compartmentAngle}°`
                    : 'N/A'
                }
              </span>

            </div>

            <span className="text-[9px] font-mono text-slate-400">
              CLOSED 60° · OPEN 120°
            </span>

          </div>


          <div className="space-y-1">

            <div className="relative w-full h-2 bg-slate-200 rounded-full overflow-hidden">

              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isOnline
                    ? 'bg-indigo-600'
                    : 'bg-slate-300'
                }`}
                style={{
                  width:
                    `${percentage(
                      compartmentAngle
                    )}%`,
                }}
              />

            </div>

            <div className="flex justify-between text-[9px] font-mono text-slate-400">

              <span>60°</span>
              <span>120°</span>

            </div>

          </div>

        </div>


        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5 space-y-3">

          <div className="flex items-center justify-between">

            <div>

              <div className="font-bold text-xs text-slate-800">
                Fire Nozzle Servo
              </div>

              <div className="font-mono text-[10px] text-slate-400">
                ESP32 GPIO 13
              </div>

            </div>

            {badge(
              servoData?.nozzle?.state,
              'nozzle'
            )}

          </div>


          <div className="flex items-end justify-between">

            <div>

              <span className="text-[10px] font-semibold text-slate-500 block uppercase tracking-wide">
                {
                  isSweep
                    ? 'Sweep Preview'
                    : 'Commanded Angle'
                }
              </span>

              <span className="text-lg font-bold font-mono text-slate-800">
                {
                  nozzleAngle !== null
                    ? `${Math.round(
                        nozzleAngle
                      )}°`
                    : 'N/A'
                }
              </span>

            </div>

            <span className="text-[9px] font-mono text-slate-400">
              Range {sweepMin}°–{sweepMax}°
            </span>

          </div>


          <div className="space-y-1">

            <div className="relative w-full h-2 bg-slate-200 rounded-full">

              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-purple-600 transition-all duration-100"
                style={{
                  left:
                    `calc(${percentage(
                      nozzleAngle,
                      sweepMin,
                      sweepMax
                    )}% - 6px)`,
                }}
              />

            </div>

            <div className="flex justify-between text-[9px] font-mono text-slate-400">

              <span>{sweepMin}° LEFT</span>
              <span>90° CTR</span>
              <span>{sweepMax}° RIGHT</span>

            </div>

          </div>


          {
            isSweep && (
              <div className="text-center text-[10px] font-bold font-mono text-purple-700 animate-pulse">
                ← LIVE SWEEP PREVIEW →
              </div>
            )
          }

        </div>


        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5">

          <div className="flex items-center justify-between">

            <div>

              <div className="font-bold text-xs text-slate-800">
                Water Pump
              </div>

              <div className="font-mono text-[10px] text-slate-400">
                ESP32 GPIO 23
              </div>

            </div>

            {badge(
              servoData?.pump?.state,
              'pump'
            )}

          </div>


          <div className="mt-3">

            <span className="text-[10px] font-semibold text-slate-500 block uppercase tracking-wide">
              Commanded Relay State
            </span>

            <span className="text-lg font-bold font-mono text-slate-800">
              {
                isOnline
                  ? (
                      servoData?.pump?.state ??
                      'UNKNOWN'
                    )
                  : 'N/A'
              }
            </span>

          </div>

        </div>

      </div>


      <div className="text-[9px] leading-relaxed text-slate-400 border-t border-slate-100 pt-3">
        Commanded/software state only. Physical actuator-position feedback is not installed. Nozzle sweep movement shown here is a frontend visual preview.
      </div>

    </div>
  );
};
