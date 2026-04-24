// This file is auto-generated — do not edit manually.

export interface ExtMethodProvider {
  extMethod(
    method: string,
    params: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
}

import type {
  AddExtensionRequest,
  ArchiveSessionRequest,
  CheckSecretRequest,
  CheckSecretResponse,
  DeleteSessionRequest,
  ExportSessionRequest,
  ExportSessionResponse,
  GetExtensionsRequest,
  GetExtensionsResponse,
  GetProviderDetailsRequest,
  GetProviderDetailsResponse,
  GetProviderModelsRequest,
  GetProviderModelsResponse,
  GetSessionExtensionsRequest,
  GetSessionExtensionsResponse,
  GetToolsRequest,
  GetToolsResponse,
  ImportSessionRequest,
  ImportSessionResponse,
  ListProvidersRequest,
  ListProvidersResponse,
  ReadConfigRequest,
  ReadConfigResponse,
  ReadResourceRequest,
  ReadResourceResponse,
  RemoveConfigRequest,
  RemoveExtensionRequest,
  RemoveSecretRequest,
  UnarchiveSessionRequest,
  UpdateWorkingDirRequest,
  UpsertConfigRequest,
  UpsertSecretRequest,
} from './types.gen.js';
import {
  zCheckSecretResponse,
  zExportSessionResponse,
  zGetExtensionsResponse,
  zGetProviderDetailsResponse,
  zGetProviderModelsResponse,
  zGetSessionExtensionsResponse,
  zGetToolsResponse,
  zImportSessionResponse,
  zListProvidersResponse,
  zReadConfigResponse,
  zReadResourceResponse,
} from './zod.gen.js';

export class RookExtClient {
  constructor(private conn: ExtMethodProvider) {}

  async RookExtensionsAdd(params: AddExtensionRequest): Promise<void> {
    await this.conn.extMethod("_rook/extensions/add", params);
  }

  async RookExtensionsRemove(params: RemoveExtensionRequest): Promise<void> {
    await this.conn.extMethod("_rook/extensions/remove", params);
  }

  async RookTools(params: GetToolsRequest): Promise<GetToolsResponse> {
    const raw = await this.conn.extMethod("_rook/tools", params);
    return zGetToolsResponse.parse(raw) as GetToolsResponse;
  }

  async RookResourceRead(
    params: ReadResourceRequest,
  ): Promise<ReadResourceResponse> {
    const raw = await this.conn.extMethod("_rook/resource/read", params);
    return zReadResourceResponse.parse(raw) as ReadResourceResponse;
  }

  async RookWorkingDirUpdate(params: UpdateWorkingDirRequest): Promise<void> {
    await this.conn.extMethod("_rook/working_dir/update", params);
  }

  async sessionDelete(params: DeleteSessionRequest): Promise<void> {
    await this.conn.extMethod("session/delete", params);
  }

  async RookConfigExtensions(
    params: GetExtensionsRequest,
  ): Promise<GetExtensionsResponse> {
    const raw = await this.conn.extMethod("_rook/config/extensions", params);
    return zGetExtensionsResponse.parse(raw) as GetExtensionsResponse;
  }

  async RookSessionExtensions(
    params: GetSessionExtensionsRequest,
  ): Promise<GetSessionExtensionsResponse> {
    const raw = await this.conn.extMethod("_rook/session/extensions", params);
    return zGetSessionExtensionsResponse.parse(
      raw,
    ) as GetSessionExtensionsResponse;
  }

  async RookProvidersList(
    params: ListProvidersRequest,
  ): Promise<ListProvidersResponse> {
    const raw = await this.conn.extMethod("_rook/providers/list", params);
    return zListProvidersResponse.parse(raw) as ListProvidersResponse;
  }

  async RookProvidersDetails(
    params: GetProviderDetailsRequest,
  ): Promise<GetProviderDetailsResponse> {
    const raw = await this.conn.extMethod("_rook/providers/details", params);
    return zGetProviderDetailsResponse.parse(raw) as GetProviderDetailsResponse;
  }

  async RookProvidersModels(
    params: GetProviderModelsRequest,
  ): Promise<GetProviderModelsResponse> {
    const raw = await this.conn.extMethod("_rook/providers/models", params);
    return zGetProviderModelsResponse.parse(raw) as GetProviderModelsResponse;
  }

  async RookConfigRead(params: ReadConfigRequest): Promise<ReadConfigResponse> {
    const raw = await this.conn.extMethod("_rook/config/read", params);
    return zReadConfigResponse.parse(raw) as ReadConfigResponse;
  }

  async RookConfigUpsert(params: UpsertConfigRequest): Promise<void> {
    await this.conn.extMethod("_rook/config/upsert", params);
  }

  async RookConfigRemove(params: RemoveConfigRequest): Promise<void> {
    await this.conn.extMethod("_rook/config/remove", params);
  }

  async RookSecretCheck(
    params: CheckSecretRequest,
  ): Promise<CheckSecretResponse> {
    const raw = await this.conn.extMethod("_rook/secret/check", params);
    return zCheckSecretResponse.parse(raw) as CheckSecretResponse;
  }

  async RookSecretUpsert(params: UpsertSecretRequest): Promise<void> {
    await this.conn.extMethod("_rook/secret/upsert", params);
  }

  async RookSecretRemove(params: RemoveSecretRequest): Promise<void> {
    await this.conn.extMethod("_rook/secret/remove", params);
  }

  async RookSessionExport(
    params: ExportSessionRequest,
  ): Promise<ExportSessionResponse> {
    const raw = await this.conn.extMethod("_rook/session/export", params);
    return zExportSessionResponse.parse(raw) as ExportSessionResponse;
  }

  async RookSessionImport(
    params: ImportSessionRequest,
  ): Promise<ImportSessionResponse> {
    const raw = await this.conn.extMethod("_rook/session/import", params);
    return zImportSessionResponse.parse(raw) as ImportSessionResponse;
  }

  async RookSessionArchive(params: ArchiveSessionRequest): Promise<void> {
    await this.conn.extMethod("_rook/session/archive", params);
  }

  async RookSessionUnarchive(params: UnarchiveSessionRequest): Promise<void> {
    await this.conn.extMethod("_rook/session/unarchive", params);
  }
}
