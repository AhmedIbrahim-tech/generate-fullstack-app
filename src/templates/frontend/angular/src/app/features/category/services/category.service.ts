import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import type { PaginationResult } from "../../../shared/models/pagination";
import type {
  CreateCategoryInput,
  Category,
  CategoryQuery,
  UpdateCategoryInput,
} from "../models/category.model";

const basePath = "/api/v1/categories";

@Injectable({ providedIn: "root" })
export class CategoryService {
  constructor(private readonly http: HttpClient) {}

  search(query: CategoryQuery): Observable<PaginationResult<Category>> {
    let params = new HttpParams()
      .set("page", String(query.page))
      .set("pageSize", String(query.pageSize));

    if (query.search) {
      params = params.set("search", query.search);
    }

    return this.http.get<PaginationResult<Category>>(basePath, { params });
  }

  getById(id: string): Observable<Category> {
    return this.http.get<Category>(`${basePath}/${id}`);
  }

  create(input: CreateCategoryInput): Observable<Category> {
    return this.http.post<Category>(basePath, input);
  }

  update(input: UpdateCategoryInput): Observable<Category> {
    return this.http.put<Category>(`${basePath}/${input.id}`, input);
  }
}
