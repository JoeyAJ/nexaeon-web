import { PUBLIC_RESOURCE_STATUS } from '../lib/publicApiClient.js';

const RESOURCE_STATE_COPY = {
  zh: {
    loading: {
      title: '正在載入公開資料',
      body: '請稍候，資料正在連線取得。',
    },
    refreshing: {
      title: '正在重新連線',
      body: '目前保留已載入內容，更新完成後會自動顯示。',
    },
    empty: {
      title: '目前沒有公開內容',
      body: '資料來源已正常回應，但目前沒有可公開顯示的項目。',
    },
    filterEmpty: {
      title: '沒有符合條件的結果',
      body: '請調整搜尋或篩選條件後再查看。',
    },
    partial: {
      title: '部分資料來源暫時無法取得',
      body: '已載入的公開內容會繼續顯示，你可以稍後再試。',
    },
    fallback: {
      title: '目前使用暫時備用內容',
      body: '即時資料來源暫時不可用，頁面先顯示安全的公開備用內容。',
    },
    error: {
      title: '暫時無法載入資料',
      body: '連線未完成或資料格式無法確認，請稍後再試。',
    },
    retry: '再試一次',
  },
  en: {
    loading: {
      title: 'Loading public data',
      body: 'Please wait while the page connects to the public source.',
    },
    refreshing: {
      title: 'Reconnecting',
      body: 'Previously loaded content stays visible and will update when ready.',
    },
    empty: {
      title: 'No published content yet',
      body: 'The data source responded normally, but there are no public items to show.',
    },
    filterEmpty: {
      title: 'No matching results',
      body: 'Adjust the search or filters to view more content.',
    },
    partial: {
      title: 'Some sources are temporarily unavailable',
      body: 'Available public content remains visible. You can try again later.',
    },
    fallback: {
      title: 'Temporarily using fallback content',
      body: 'The live source is unavailable, so safe public backup content is shown.',
    },
    error: {
      title: 'Unable to load data',
      body: 'The connection did not complete or the response could not be verified. Please try again.',
    },
    retry: 'Try again',
  },
  ko: {
    loading: {
      title: '공개 데이터를 불러오는 중',
      body: '공개 데이터 출처에 연결하고 있다. 잠시만 기다려 주세요.',
    },
    refreshing: {
      title: '다시 연결하는 중',
      body: '이미 불러온 내용은 유지되며, 업데이트가 끝나면 자동으로 반영된다.',
    },
    empty: {
      title: '아직 공개된 내용이 없다',
      body: '데이터 출처는 정상 응답했지만, 현재 공개 표시할 항목이 없다.',
    },
    filterEmpty: {
      title: '조건에 맞는 결과가 없다',
      body: '검색어나 필터를 조정해 다시 확인해 주세요.',
    },
    partial: {
      title: '일부 데이터 출처를 잠시 사용할 수 없다',
      body: '불러온 공개 내용은 계속 표시된다. 잠시 후 다시 시도할 수 있다.',
    },
    fallback: {
      title: '임시 예비 콘텐츠를 사용 중',
      body: '실시간 데이터 출처를 사용할 수 없어 안전한 공개 예비 콘텐츠를 표시한다.',
    },
    error: {
      title: '데이터를 불러올 수 없다',
      body: '연결이 완료되지 않았거나 응답을 확인할 수 없다. 잠시 후 다시 시도해 주세요.',
    },
    retry: '다시 시도',
  },
};

function getNoticeKind(status, isRefreshing) {
  if (isRefreshing) return 'refreshing';
  if (status === PUBLIC_RESOURCE_STATUS.LOADING) return 'loading';
  if (status === PUBLIC_RESOURCE_STATUS.EMPTY) return 'empty';
  if (status === PUBLIC_RESOURCE_STATUS.PARTIAL) return 'partial';
  if (status === PUBLIC_RESOURCE_STATUS.FALLBACK) return 'fallback';
  if (status === PUBLIC_RESOURCE_STATUS.ERROR) return 'error';
  return null;
}

export default function ResourceStateNotice({
  lang,
  status,
  isRefreshing = false,
  onRetry,
  retryDisabled = false,
  compact = false,
}) {
  const kind = getNoticeKind(status, isRefreshing);
  if (!kind) return null;

  const copy = RESOURCE_STATE_COPY[lang] || RESOURCE_STATE_COPY.zh;
  const text = copy[kind] || copy.error;
  const isError = status === PUBLIC_RESOURCE_STATUS.ERROR;
  const canRetry = ['partial', 'fallback', 'error'].includes(kind);

  return (
    <section
      className="resource-state-notice"
      data-state={kind}
      data-compact={compact ? 'true' : 'false'}
      role={isError ? 'alert' : 'status'}
      aria-live="polite"
    >
      <div>
        <strong>{text.title}</strong>
        <p>{text.body}</p>
      </div>
      {canRetry && onRetry ? (
        <button
          className="resource-state-retry"
          type="button"
          onClick={onRetry}
          disabled={retryDisabled}
          aria-label={copy.retry}
        >
          {copy.retry}
        </button>
      ) : null}
    </section>
  );
}
