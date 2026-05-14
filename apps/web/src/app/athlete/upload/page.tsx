import { UploadForm } from "./upload-form";

export default function UploadPage() {
  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Upload activity</h1>
        <p className="text-sm text-muted-foreground">
          Drop a .fit file from any Garmin / Wahoo / Zwift export.
        </p>
      </div>
      <UploadForm />
    </div>
  );
}
