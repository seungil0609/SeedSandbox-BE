import mongoose, { Schema, Document } from "mongoose";

export interface IAsset extends Document {
  ticker: string;
  name: string;
  assetType: string;
  sector?: string;
  //  ETF 상세 분석을 위한 섹터 비중 맵
  sectorWeights?: Map<string, number>;
}

const AssetSchema: Schema = new Schema({
  ticker: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  assetType: {
    // 예: 'stock', 'etf', 'crypto'
    type: String,
    required: true,
  },
  sector: {
    type: String,
    required: false,
  },
  // 섹터 비중 저장 필드
  sectorWeights: {
    type: Map,
    of: Number,
    default: {},
  },
});

export default mongoose.model<IAsset>("Asset", AssetSchema);
