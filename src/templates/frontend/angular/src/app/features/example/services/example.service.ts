import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import type { PaginationResult } from "../../../shared/models/pagination";
import type {
  CreateExampleInput,
  Example,
  ExampleQuery,
  UpdateExampleInput,
} from "../models/example.model";

const basePath = "/api/v1/examples";

@Injectable({ providedIn: "root" })
export class ExampleService {
  constructor(private readonly http: HttpClient) {}

  search(query: ExampleQuery): Observable<PaginationResult<Example>> {
    let params = new HttpParams()
      .set("page", String(query.page))
      .set("pageSize", String(query.pageSize));

    if (query.search) {
      params = params.set("search", query.search);
    }

    return this.http.get<PaginationResult<Example>>(basePath, { params });
  }

  getById(id: string): Observable<Example> {
    return this.http.get<Example>(`${basePath}/${id}`);
  }

  create(input: CreateExampleInput): Observable<Example> {
    return this.http.post<Example>(basePath, input);
  }

  update(input: UpdateExampleInput): Observable<Example> {
    return this.http.put<Example>(`${basePath}/${input.id}`, input);
  }
}
