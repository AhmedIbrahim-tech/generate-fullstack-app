import { getFrontendFilePath } from '../../../utils/project-paths.js';

/**
 * Plan the shared, reusable React form controls used by generated feature
 * modules. Every file is written only when it does not already exist so that
 * user customizations survive regeneration.
 *
 * @param {object} [config]
 * @returns {{ relativePath: string, contents: string, writeMode: 'ifMissing' }[]}
 */
export function planSharedReactControls(config = {}) {
  const formsBase = (...segments) =>
    getFrontendFilePath(config, 'src', 'shared', 'components', 'forms', ...segments);
  const typesBase = (...segments) =>
    getFrontendFilePath(config, 'src', 'shared', 'types', ...segments);

  return [
    {
      relativePath: typesBase('stored-file.types.ts'),
      contents: STORED_FILE_TYPES,
      writeMode: 'ifMissing',
    },
    {
      relativePath: typesBase('lookup.types.ts'),
      contents: LOOKUP_TYPES,
      writeMode: 'ifMissing',
    },
    {
      relativePath: formsBase('EnumSelect.tsx'),
      contents: ENUM_SELECT,
      writeMode: 'ifMissing',
    },
    {
      relativePath: formsBase('LookupSelect.tsx'),
      contents: LOOKUP_SELECT,
      writeMode: 'ifMissing',
    },
    {
      relativePath: formsBase('MultiLookupSelect.tsx'),
      contents: MULTI_LOOKUP_SELECT,
      writeMode: 'ifMissing',
    },
    {
      relativePath: formsBase('FileUploadField.tsx'),
      contents: FILE_UPLOAD_FIELD,
      writeMode: 'ifMissing',
    },
    {
      relativePath: formsBase('ImageUploadField.tsx'),
      contents: IMAGE_UPLOAD_FIELD,
      writeMode: 'ifMissing',
    },
  ];
}

const STORED_FILE_TYPES = `export type StoredFileDto = {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  url: string;
};
`;

const LOOKUP_TYPES = `export type LookupOption = {
  id: string;
  displayName: string;
};
`;

const ENUM_SELECT = `"use client";

type EnumSelectOption = {
  value: number;
  label: string;
};

type EnumSelectProps = {
  value: number | null;
  onChange: (value: number) => void;
  options: readonly EnumSelectOption[];
  placeholder?: string;
  id?: string;
  disabled?: boolean;
};

export function EnumSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  id,
  disabled,
}: EnumSelectProps) {
  return (
    <select
      id={id}
      disabled={disabled}
      value={value ?? ""}
      onChange={(event) => onChange(Number(event.target.value))}
      className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
`;

const LOOKUP_SELECT = `"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/api-client";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import type { LookupOption } from "@/shared/types/lookup.types";

type LookupSelectProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  endpoint: string;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
};

export function LookupSelect({
  value,
  onChange,
  endpoint,
  placeholder = "Select...",
  id,
  disabled,
}: LookupSelectProps) {
  const [options, setOptions] = useState<LookupOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    apiClient
      .get<LookupOption[]>(endpoint)
      .then((response) => {
        if (active) {
          setOptions(response.data);
          setError(null);
        }
      })
      .catch((cause) => {
        if (active) {
          setError(getErrorMessage(cause));
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [endpoint]);

  return (
    <div className="flex flex-col gap-1">
      <select
        id={id}
        disabled={disabled || isLoading}
        value={value ?? ""}
        onChange={(event) =>
          onChange(event.target.value ? event.target.value : null)
        }
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
      >
        <option value="">{isLoading ? "Loading..." : placeholder}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.displayName}
          </option>
        ))}
      </select>
      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
`;

const MULTI_LOOKUP_SELECT = `"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/api-client";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import type { LookupOption } from "@/shared/types/lookup.types";

type MultiLookupSelectProps = {
  value: string[];
  onChange: (value: string[]) => void;
  endpoint: string;
  disabled?: boolean;
};

export function MultiLookupSelect({
  value,
  onChange,
  endpoint,
  disabled,
}: MultiLookupSelectProps) {
  const [options, setOptions] = useState<LookupOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    apiClient
      .get<LookupOption[]>(endpoint)
      .then((response) => {
        if (active) {
          setOptions(response.data);
          setError(null);
        }
      })
      .catch((cause) => {
        if (active) {
          setError(getErrorMessage(cause));
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [endpoint]);

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((item) => item !== id));
    } else {
      onChange([...value, id]);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {isLoading ? <p className="text-xs text-zinc-500">Loading...</p> : null}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const checked = value.includes(option.id);
          return (
            <label
              key={option.id}
              className={
                checked
                  ? "flex cursor-pointer items-center gap-2 rounded-md border border-zinc-900 bg-zinc-900 px-3 py-1.5 text-sm text-white"
                  : "flex cursor-pointer items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800"
              }
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(option.id)}
              />
              {option.displayName}
            </label>
          );
        })}
      </div>
      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
`;

const FILE_UPLOAD_FIELD = `"use client";

import { useState } from "react";
import { apiClient } from "@/lib/api/api-client";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import type { StoredFileDto } from "@/shared/types/stored-file.types";

type BaseUploadProps = {
  accept?: string;
  maxFiles?: number;
  maxSizeBytes?: number;
  disabled?: boolean;
};

type SingleFileProps = BaseUploadProps & {
  multiple?: false;
  value: string | null;
  onChange: (value: string | null) => void;
};

type MultiFileProps = BaseUploadProps & {
  multiple: true;
  value: string[];
  onChange: (value: string[]) => void;
};

type FileUploadFieldProps = SingleFileProps | MultiFileProps;

async function uploadFile(file: File): Promise<StoredFileDto> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await apiClient.post<StoredFileDto>("/api/v1/Files", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export function FileUploadField(props: FileUploadFieldProps) {
  const { accept, maxFiles, maxSizeBytes, disabled } = props;
  const [files, setFiles] = useState<StoredFileDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const emit = (next: StoredFileDto[]) => {
    if (props.multiple) {
      props.onChange(next.map((item) => item.id));
    } else {
      props.onChange(next.length > 0 ? next[0].id : null);
    }
  };

  const handleSelect = async (selected: FileList | null) => {
    if (!selected || selected.length === 0) {
      return;
    }

    setError(null);
    setIsUploading(true);
    try {
      const incoming = Array.from(selected);
      for (const file of incoming) {
        if (maxSizeBytes && file.size > maxSizeBytes) {
          throw new Error(file.name + " exceeds the maximum file size.");
        }
      }

      const uploaded: StoredFileDto[] = [];
      for (const file of incoming) {
        uploaded.push(await uploadFile(file));
      }

      if (props.multiple) {
        const merged = [...files, ...uploaded];
        const next =
          typeof maxFiles === "number" ? merged.slice(0, maxFiles) : merged;
        setFiles(next);
        emit(next);
      } else {
        const next = uploaded.slice(0, 1);
        setFiles(next);
        emit(next);
      }
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (id: string) => {
    const next = files.filter((item) => item.id !== id);
    setFiles(next);
    emit(next);
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        type="file"
        accept={accept}
        multiple={props.multiple}
        disabled={disabled || isUploading}
        onChange={(event) => {
          void handleSelect(event.target.files);
        }}
        className="block text-sm text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-sm file:text-white"
      />
      {isUploading ? (
        <p className="text-xs text-zinc-500">Uploading...</p>
      ) : null}
      {files.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-800"
            >
              <span className="truncate">{file.fileName}</span>
              <button
                type="button"
                className="text-xs text-red-600 underline"
                onClick={() => removeFile(file.id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
`;

const IMAGE_UPLOAD_FIELD = `"use client";

import { useState } from "react";
import { apiClient } from "@/lib/api/api-client";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import type { StoredFileDto } from "@/shared/types/stored-file.types";

type BaseUploadProps = {
  accept?: string;
  maxFiles?: number;
  maxSizeBytes?: number;
  disabled?: boolean;
};

type SingleImageProps = BaseUploadProps & {
  multiple?: false;
  value: string | null;
  onChange: (value: string | null) => void;
};

type MultiImageProps = BaseUploadProps & {
  multiple: true;
  value: string[];
  onChange: (value: string[]) => void;
};

type ImageUploadFieldProps = SingleImageProps | MultiImageProps;

async function uploadFile(file: File): Promise<StoredFileDto> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await apiClient.post<StoredFileDto>("/api/v1/Files", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export function ImageUploadField(props: ImageUploadFieldProps) {
  const { accept = "image/*", maxFiles, maxSizeBytes, disabled } = props;
  const [files, setFiles] = useState<StoredFileDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const emit = (next: StoredFileDto[]) => {
    if (props.multiple) {
      props.onChange(next.map((item) => item.id));
    } else {
      props.onChange(next.length > 0 ? next[0].id : null);
    }
  };

  const handleSelect = async (selected: FileList | null) => {
    if (!selected || selected.length === 0) {
      return;
    }

    setError(null);
    setIsUploading(true);
    try {
      const incoming = Array.from(selected);
      for (const file of incoming) {
        if (maxSizeBytes && file.size > maxSizeBytes) {
          throw new Error(file.name + " exceeds the maximum file size.");
        }
      }

      const uploaded: StoredFileDto[] = [];
      for (const file of incoming) {
        uploaded.push(await uploadFile(file));
      }

      if (props.multiple) {
        const merged = [...files, ...uploaded];
        const next =
          typeof maxFiles === "number" ? merged.slice(0, maxFiles) : merged;
        setFiles(next);
        emit(next);
      } else {
        const next = uploaded.slice(0, 1);
        setFiles(next);
        emit(next);
      }
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (id: string) => {
    const next = files.filter((item) => item.id !== id);
    setFiles(next);
    emit(next);
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        type="file"
        accept={accept}
        multiple={props.multiple}
        disabled={disabled || isUploading}
        onChange={(event) => {
          void handleSelect(event.target.files);
        }}
        className="block text-sm text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-sm file:text-white"
      />
      {isUploading ? (
        <p className="text-xs text-zinc-500">Uploading...</p>
      ) : null}
      {files.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {files.map((file) => (
            <div key={file.id} className="flex flex-col items-center gap-1">
              <img
                src={file.url}
                alt={file.fileName}
                className="h-20 w-20 rounded-md border border-zinc-200 object-cover"
              />
              <button
                type="button"
                className="text-xs text-red-600 underline"
                onClick={() => removeFile(file.id)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : null}
      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
`;
