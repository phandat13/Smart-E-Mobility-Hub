import { icons } from '../../../assets/icons';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDemoState } from '../../../mocks/pv-mt/store';
import { priorityLabel } from '../../../shared/format';
import { Badge, Empty, Notice } from '../../../shared/ui';
import OrderDialog from '../components/OrderDialog';
import '../styles/mt.css';
import IncidentDetail from '../components/IncidentDetail';
import { PAGE_SIZE, priorityTone, queueStatus, sourceShort } from '../utils/incidentQueue';

export function IncidentQueuePage() {
  const state = useDemoState();
  const [params] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [page, setPage] = useState(1);
  useEffect(() => {
    setSearch(params.get('q') ?? '');
    setPage(1);
  }, [params]);
  const [selected, setSelected] = useState(state.incidents[0]?.id ?? '');
  const [assigning, setAssigning] = useState(false);
  const [message, setMessage] = useState('');
  const query = search.trim().toLocaleLowerCase('vi');
  const filtered = state.incidents
    .filter((i) =>
      `${i.id} ${i.resourceId} ${i.category} ${i.description}`
        .toLocaleLowerCase('vi')
        .includes(query),
    )
    .sort(
      (a, b) =>
        ['HIGH', 'MEDIUM', 'LOW'].indexOf(a.priority) -
        ['HIGH', 'MEDIUM', 'LOW'].indexOf(b.priority),
    );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const incident = state.incidents.find((i) => i.id === selected);
  return (
    <div className="mt-operator" data-figma-node="15:1578">
      <div className="ui-page-heading">
        <h1>Hàng đợi sự cố & phân công bảo trì</h1>
        <Link className="ui-button ui-button--primary" to="/maintenance/orders/new">
          {icons.tool} Tạo lệnh bảo trì
        </Link>
      </div>
      {message && (
        <Notice tone="success" role="status">
          {message}
        </Notice>
      )}
      <div className="mt-queue-layout">
        <section className="ui-panel mt-queue">
          <h2>Hàng đợi phiếu sự cố · theo mức ưu tiên</h2>
          <p className="ui-subtitle">
            Phiếu từ sinh viên/tài xế (MT01) và cảnh báo hệ thống; sắp xếp theo mức ảnh hưởng tới
            Hub
          </p>
          <label className="mt-search">
            <span aria-hidden="true">{icons.searchSmall}</span>
            <input
              aria-label="Tìm phiếu sự cố"
              placeholder="Tìm theo mã ticket hoặc nội dung"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>
          {!filtered.length ? (
            <Empty title="Không có phiếu phù hợp">Thử thay đổi từ khóa tìm kiếm.</Empty>
          ) : (
            <>
              <div className="ui-table-wrap">
                <table className="ui-table mt-queue-table">
                  <thead>
                    <tr>
                      <th>MÃ TICKET</th>
                      <th>MÔ TẢ SỰ CỐ</th>
                      <th>MỨC ĐỘ</th>
                      <th>TRẠNG THÁI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((i) => (
                      <tr
                        className={selected === i.id ? 'mt-row-selected' : ''}
                        key={i.id}
                        onClick={() => setSelected(i.id)}
                      >
                        <td>
                          <button
                            type="button"
                            className="mt-text-button"
                            onClick={() => setSelected(i.id)}
                            aria-label={`Xem phiếu ${i.id}`}
                            aria-pressed={selected === i.id}
                          >
                            #{i.id}
                          </button>
                        </td>
                        <td className="mt-queue-description">
                          {i.resourceId} {i.category.toLocaleLowerCase('vi')} ({sourceShort(i)})
                        </td>
                        <td>
                          <Badge tone={priorityTone[i.priority]}>{priorityLabel[i.priority]}</Badge>
                        </td>
                        <td className="mt-queue-status">{queueStatus(i, state)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-pagination">
                <span>
                  Hiển thị {visible.length} trên {filtered.length} ticket
                </span>
                <nav aria-label="Phân trang hàng đợi">
                  <button
                    type="button"
                    aria-label="Trang trước"
                    disabled={current === 1}
                    onClick={() => setPage(current - 1)}
                  >
                    ‹
                  </button>
                  {Array.from({ length: pages }, (_, index) => (
                    <button
                      type="button"
                      key={index}
                      aria-current={current === index + 1 ? 'page' : undefined}
                      onClick={() => setPage(index + 1)}
                    >
                      {index + 1}
                    </button>
                  ))}
                  <button
                    type="button"
                    aria-label="Trang sau"
                    disabled={current === pages}
                    onClick={() => setPage(current + 1)}
                  >
                    ›
                  </button>
                </nav>
              </div>
            </>
          )}
        </section>
        <aside className="ui-panel mt-ticket-panel">
          {incident ? (
            <IncidentDetail
              key={incident.id}
              incident={incident}
              assign={() => setAssigning(true)}
              accepted={() => setMessage(`Đã nghiệm thu và đóng phiếu ${incident.id}.`)}
            />
          ) : (
            <Empty title="Chọn một phiếu để xem chi tiết" />
          )}
        </aside>
      </div>
      {assigning && incident && (
        <OrderDialog
          resourceIds={[incident.resourceId]}
          incidentId={incident.id}
          close={() => setAssigning(false)}
          created={(id) => {
            setAssigning(false);
            setMessage(`Đã tạo lệnh ${id} và phân công kỹ thuật viên.`);
          }}
        />
      )}
      <footer className="mt-demo-footer">
        <span>Dữ liệu mô phỏng · Cổng vận hành</span>
        <Link to="/setup">Đổi cổng / điều khiển demo</Link>
      </footer>
    </div>
  );
}
