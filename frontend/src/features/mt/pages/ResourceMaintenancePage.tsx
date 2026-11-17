import { icons } from '../../../assets/icons';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDemoState } from '../../../mocks/pv-mt/store';
import { resourceLabel } from '../../../shared/format';
import { Badge, Button, Empty, Field, Notice } from '../../../shared/ui';
import OrderDialog from '../components/OrderDialog';
import '../styles/mt.css';
import OrderList from '../components/OrderList';

export function ResourceMaintenancePage() {
  const state = useDemoState();
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const resources = state.resources.filter(
    (r) =>
      r.status !== 'AVAILABLE' &&
      `${r.id} ${r.description}`.toLowerCase().includes(query.toLowerCase()),
  );
  const toggle = (id: string) =>
    setSelected((previous) =>
      previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id],
    );
  return (
    <div className="mt-operator" data-figma-node="400:2739">
      <div className="ui-page-heading">
        <div>
          <h1>Cảnh báo xe / thiết bị lỗi</h1>
          <p>Hệ thống tự động phân tích dữ liệu cảm biến và chuyển tài nguyên lỗi sang “Báo lỗi”</p>
        </div>
        <Link className="ui-link" to="/maintenance">
          {icons.back} Hàng đợi sự cố
        </Link>
      </div>
      {message && (
        <Notice tone="success" role="status">
          {message}
        </Notice>
      )}
      <section className="ui-panel">
        <div className="ui-page-heading">
          <Field label="Tìm tài nguyên">
            <input
              className="ui-input"
              placeholder="Mã xe, cổng sạc hoặc mô tả"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </Field>
          <Button disabled={!selected.length} onClick={() => setOpen(true)}>
            Tạo lệnh bảo trì ({selected.length})
          </Button>
        </div>
        {!resources.length ? (
          <Empty title="Không có tài nguyên lỗi phù hợp" />
        ) : (
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>
                    <span className="sr-only">Chọn tài nguyên</span>
                  </th>
                  <th>TÀI NGUYÊN</th>
                  <th>MÃ LỖI</th>
                  <th>MÔ TẢ</th>
                  <th>HUB</th>
                  <th>TRẠNG THÁI</th>
                </tr>
              </thead>
              <tbody>
                {resources.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Chọn ${r.id}`}
                        checked={selected.includes(r.id)}
                        disabled={r.status !== 'FAULTY'}
                        onChange={() => toggle(r.id)}
                      />
                    </td>
                    <td>
                      <strong>{r.kind === 'PORT' ? r.name : r.id}</strong>
                    </td>
                    <td>{r.errorCode || '—'}</td>
                    <td>{r.description}</td>
                    <td>
                      {r.kind === 'VEHICLE' && r.status === 'IN_USE'
                        ? 'Đang trong chuyến đi'
                        : state.hubs.find((h) => h.id === r.hubId)?.shortName}
                    </td>
                    <td>
                      <Badge
                        tone={
                          r.status === 'FAULTY'
                            ? 'red'
                            : r.status === 'AVAILABLE'
                              ? 'green'
                              : 'blue'
                        }
                      >
                        {resourceLabel[r.status]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Notice tone="neutral">
          Xe đang trong chuyến đi, tài nguyên chờ kiểm tra hoặc đã thuộc lệnh khác không được chọn.
        </Notice>
      </section>
      <OrderList />
      {open && (
        <OrderDialog
          resourceIds={selected}
          close={() => setOpen(false)}
          created={(id) => {
            setOpen(false);
            setSelected([]);
            setMessage(`Đã tạo lệnh ${id}. Tài nguyên đã chuyển sang Khóa bảo trì.`);
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
